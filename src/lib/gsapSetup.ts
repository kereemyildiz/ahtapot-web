"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { useGSAP } from "@gsap/react";

// Tek kayıt noktası — her client bileşen buradan import eder, plugin'ler
// birden fazla yerde registerPlugin edilmez. DrawSVGPlugin ücretsiz (Club
// GSAP üyeliği gerekmiyor, public gsap paketinden geliyor). SplitText
// bilinçli olarak yok: JS bütçesi için kelime bölme sunucuda yapılıyor.
gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, useGSAP);

export { gsap, ScrollTrigger, DrawSVGPlugin, useGSAP };
