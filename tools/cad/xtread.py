"""Parasolid XT neutral binary (transmit/partition) okuyucu.

Kaynak: Parasolid XT Format Reference — neutral binary: big-endian, düğüm türü
2 bayt, değişken uzunluk 4 bayt, işaretçi/pozitif tamsayı "index+1" kısa
kodlaması, int 4 bayt, double 8 bayt. Gömülü şema (SCH_x_y_13006): her türün
ilk düğümünde temel şemaya göre düzenleme dizisi (C/D/I/A/Z) ya da yeni tür
tanımı gelir.

read_xt(bytes, base_json) → {index: (tür, {alan: değer})}
"""
import json
import struct


class XTError(Exception):
    pass


SIZES = {"u": 1, "c": 1, "l": 1, "n": 2, "w": 2, "d": 4, "f": 8, "i": 16, "v": 24, "b": 48, "h": 24}


class Reader:
    def __init__(self, data):
        self.d = data
        self.p = 0

    def take(self, n):
        if self.p + n > len(self.d):
            raise XTError(f"dosya sonu @ {self.p}")
        b = self.d[self.p : self.p + n]
        self.p += n
        return b

    def u8(self):
        return self.take(1)[0]

    def i16(self):
        return struct.unpack(">h", self.take(2))[0]

    def u16(self):
        return struct.unpack(">H", self.take(2))[0]

    def i32(self):
        return struct.unpack(">i", self.take(4))[0]

    def u32(self):
        return struct.unpack(">I", self.take(4))[0]

    def ptr(self):
        r = self.i16()
        q = 0
        if r < 0:
            q = self.i16()
            r = -r
        return q * 32767 + r - 1

    def sstr(self):
        n = self.u8()
        return self.take(n).decode("latin-1")

    def value(self, code):
        if code == "p":
            return self.ptr()
        if code in ("u", "l"):
            return self.u8()
        if code == "c":
            return chr(self.u8())
        if code in ("n", "w"):
            return self.i16()
        if code == "d":
            return self.i32()
        if code == "f":
            return struct.unpack(">d", self.take(8))[0]
        if code in ("v", "h"):
            return struct.unpack(">3d", self.take(24))
        if code == "i":
            return struct.unpack(">2d", self.take(16))
        if code == "b":
            return struct.unpack(">6d", self.take(48))
        raise XTError(f"bilinmeyen alan türü {code!r}")


def read_field_def(r):
    name = r.sstr()
    ptr_class = r.i16()
    n_elts = r.ptr()  # pozitif tamsayı: index kodlaması
    ftype = r.sstr() if ptr_class == 0 else "p"
    xmt = r.u8() if n_elts == 1 else 1
    return [name, ftype, n_elts, xmt]


# Belge V12 (SCH_12006); gömülü şemanın tabanı V13 (SCH_13006). Baytlardan
# çözülen farklar: (tür adı, şu alandan sonra, eklenen alan).
BASE_PATCH = [
    ("BODY", "body_type", ["v13_extra_u", "u", 0]),
]


def read_xt(data, base_path, log=None):
    base = json.load(open(base_path, encoding="utf-8"))
    base_by_type = {}
    for name, num in base["types"].items():
        s = base["structs"].get(name)
        if s and "fields" in s:
            base_by_type[num] = (name, [[f[0], f[1], f[2], 1] for f in s["fields"]])
    for tname, after, field in BASE_PATCH:
        num = base["types"][tname]
        fl = base_by_type[num][1]
        k = next(i for i, f in enumerate(fl) if f[0] == after)
        fl.insert(k + 1, field + [1])

    r = Reader(data)
    if r.take(4) != b"PS\x00\x00":
        raise XTError("neutral binary değil")
    n = r.u16()
    modeller = r.take(n).decode("latin-1")
    n = r.u32()
    schema = r.take(n).decode("latin-1")
    embedded = schema.count("_") >= 3
    if embedded:
        r.u16()  # en büyük düğüm türü
    usfld = r.u32()

    cur = {}  # tür → (ad, alanlar)
    nodes = {}
    while True:
        t = r.i16()
        if t == 1:
            break
        if t not in cur:
            if not embedded:
                if t not in base_by_type:
                    raise XTError(f"bilinmeyen tür {t} @ {r.p}")
                cur[t] = base_by_type[t]
            elif t in base_by_type:
                bname, bfields = base_by_type[t]
                flag = r.u8()
                if flag == 0xFF:
                    cur[t] = (bname, bfields)
                else:
                    out = []
                    bi = 0
                    while True:
                        op = chr(r.u8())
                        if op == "C":
                            if bi >= len(bfields):
                                raise XTError(f"tür {t} {bname}: temel şemada {len(bfields)} alan var, "
                                              f"dosya daha fazlasını kopyalıyor; şimdiye kadar {[f[0] for f in out]}")
                            out.append(bfields[bi])
                            bi += 1
                        elif op == "D":
                            bi += 1
                        elif op in ("I", "A"):
                            out.append(read_field_def(r))
                        elif op == "Z":
                            break
                        else:
                            raise XTError(f"tür {t}: bilinmeyen düzenleme {op!r} @ {r.p}")
                    if len(out) != flag:
                        raise XTError(f"tür {t}: alan sayısı {len(out)} != {flag}")
                    cur[t] = (bname, out)
            else:
                nf = r.u8()
                name = r.sstr()
                r.sstr()  # açıklama
                cur[t] = (name, [read_field_def(r) for _ in range(nf)])
            if log is not None:
                log.append((t, cur[t][0], len(cur[t][1])))
        name, fields = cur[t]
        variable = any(f[2] == 1 for f in fields)
        vlen = r.i32() if variable else 0
        idx = r.ptr()
        vals = {}
        for fname, code, n_elts, xmt in fields:
            if not xmt:
                continue
            if n_elts == 1:
                vals[fname] = [r.value(code) for _ in range(vlen)]
            elif n_elts > 1:
                vals[fname] = [r.value(code) for _ in range(n_elts)]
            else:
                vals[fname] = r.value(code)
        if usfld:
            vals["_usfld"] = [r.i32() for _ in range(usfld)]
        nodes[idx] = (t, name, vals)
    return {"modeller": modeller, "schema": schema, "nodes": nodes, "types": {t: v[0] for t, v in cur.items()}}


if __name__ == "__main__":
    import sys
    from collections import Counter

    data = open(sys.argv[1], "rb").read()
    log = []
    try:
        res = read_xt(data, sys.argv[2], log)
        c = Counter(v[1] for v in res["nodes"].values())
        print(res["schema"], len(res["nodes"]), "düğüm")
        print(c.most_common(40))
    except XTError as e:
        print("HATA:", e)
        print("okunan türler:", log[-8:])
