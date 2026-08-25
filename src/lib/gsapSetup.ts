"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Tek kayıt noktası — her client bileşen buradan import eder, plugin'ler
// birden fazla yerde registerPlugin edilmez. DrawSVGPlugin ve SplitText
// ücretsiz (Club GSAP üyeliği gerekmiyor, public gsap paketinden geliyor).
gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, SplitText, useGSAP);

export { gsap, ScrollTrigger, DrawSVGPlugin, SplitText, useGSAP };
