import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "./supabaseClient";

const CURRENT_YEAR = 2026;
const YEAR_MIN = 1930;
const YEAR_MAX = 2030;
const yearToPercent = (year) =>
    ((year - YEAR_MIN) / (YEAR_MAX - YEAR_MIN)) * 100;

// 17 artistas curados: los que cruzan al menos 2 eras y tienen catálogo significativo
const BRIDGE_ARTIST_NAMES = [
    "Los Montañeses del Álamo",
    "Los Alegres de Terán",
    "El Piporro",
    "Los Rancheritos del Topo Chico",
    "Carlos y José",
    "Celso Piña",
    "Ramón Ayala",
    "Los Cadetes de Linares",
    "Bronco",
    "Los Cardenales de Nuevo León",
    "Los Mier",
    "Tatiana",
    "Gloria Trevi",
    "Disolución Social",
    "El Gran Silencio",
    "Los Claxons",
    "Ely Guerra",
];

const ERAS = [
    { name: "Orígenes", start: 1950, end: 1979, color: "#8B4513" },
    { name: "Los 80s", start: 1980, end: 1989, color: "#D87E3D" },
    { name: "Avanzada", start: 1990, end: 2002, color: "#E63946" },
    { name: "Diversificación", start: 2003, end: 2015, color: "#2A9D8F" },
    { name: "Nueva Era", start: 2016, end: 2026, color: "#9B5DE5" },
];

const AXIS_YEARS = [1930, 1950, 1970, 1990, 2010, 2030];

export default function PuentesGeneracionales() {
    const [artists, setArtists] = useState([]);
    const [loading, setLoading] = useState(true);
    const [hovered, setHovered] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        async function fetchData() {
            const { data, error } = await supabase
                .from("artistas")
                .select("id, artista, inicio, fin, activo, ciudad")
                .in("artista", BRIDGE_ARTIST_NAMES);

            if (!error && data) {
                // Normaliza el campo `fin`: si activo o fin<100 (significa "active"), usar año actual
                const processed = data
                    .map((a) => ({
                        ...a,
                        fin_real:
                            a.activo || (a.fin && a.fin < 100)
                                ? CURRENT_YEAR
                                : a.fin,
                    }))
                    .filter((a) => a.inicio && a.inicio >= YEAR_MIN)
                    .sort((a, b) => a.inicio - b.inicio);
                setArtists(processed);
            }
            setLoading(false);
        }
        fetchData();
    }, []);

    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <section className="relative bg-[#f5f0e6] text-gray-900 py-24 z-30">
            <div>
                {/* Header (centered) */}
                <div className="text-center mb-12">
                    <p className="text-terracota text-sm uppercase tracking-widest mb-2 font-medium">
                        Continuidad
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold font-dmserif text-gray-900">
                        Puentes Generacionales
                    </h2>
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-terracota border-t-transparent"></div>
                    </div>
                )}

                {/* 3-column layout: text-left 25%, timeline-center 50%, empty-right 25% */}
                <div className="flex flex-col lg:flex-row">
                    {/* LEFT 25%: narrative text */}
                    <div className="lg:w-1/4 px-6 lg:px-8 mb-10 lg:mb-0">
                        <div className="lg:sticky lg:top-20 text-gray-700 leading-relaxed space-y-4">
                            <p>
                                La historia no progresa en líneas limpias. Hay artistas
                                que cruzaron eras enteras, sosteniendo continuidad
                                mientras todo cambiaba a su alrededor.
                            </p>
                            <p>
                                <strong className="text-gray-900">Los Montañeses del Álamo</strong>{" "}
                                grabaron antes de que la mayoría de tus abuelos hayan
                                nacido — y siguen activos.{" "}
                                <strong className="text-gray-900">Ramón Ayala</strong>{" "}
                                lleva más de cinco décadas publicando.{" "}
                                <strong className="text-gray-900">Celso Piña</strong>{" "}
                                vivió el norteño tradicional, lideró la Avanzada Regia
                                con <em>Barrio Bravo</em>, y abrió la cumbia rebelde
                                antes de morir en 2019.
                            </p>
                            <p>
                                Estos no son anomalías. Son evidencia de que la memoria
                                sonora regiomontana no es generacional: es{" "}
                                <em className="text-gray-900 font-semibold">acumulativa</em>.
                                Cada nueva era se construye encima de lo anterior, no en
                                su lugar.
                            </p>
                        </div>
                    </div>

                    {/* CENTER 50%: Gantt timeline */}
                    <div className="lg:w-1/2 lg:max-w-xl mx-auto" onMouseMove={handleMouseMove}>
                {!loading && artists.length > 0 && (
                    <div
                        className="w-full"
                    >
                        {/* Era band labels (above axis) */}
                        <div className="grid grid-cols-[160px_1fr] mb-1">
                            <div></div>
                            <div className="relative h-5">
                                {ERAS.map((era) => {
                                    const left = yearToPercent(era.start);
                                    const width =
                                        yearToPercent(era.end) - yearToPercent(era.start);
                                    return (
                                        <div
                                            key={era.name}
                                            className="absolute top-0 text-[10px] uppercase tracking-wider text-gray-500 text-center"
                                            style={{
                                                left: `${left}%`,
                                                width: `${width}%`,
                                            }}
                                        >
                                            {era.name}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Year axis */}
                        <div className="grid grid-cols-[160px_1fr] mb-3">
                            <div></div>
                            <div className="relative h-5 border-b border-gray-400">
                                {AXIS_YEARS.map((y) => (
                                    <div
                                        key={y}
                                        className="absolute text-xs text-gray-600"
                                        style={{
                                            left: `${yearToPercent(y)}%`,
                                            transform: "translateX(-50%)",
                                            top: "2px",
                                        }}
                                    >
                                        {y}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Artist rows */}
                        <div className="grid grid-cols-[160px_1fr] gap-y-2">
                            {artists.map((a) => {
                                const isHovered = hovered?.id === a.id;
                                return (
                                    <React.Fragment key={a.id}>
                                        {/* Label */}
                                        <div
                                            className={`text-xs text-right pr-3 self-center truncate transition-colors ${
                                                isHovered
                                                    ? "text-terracota font-semibold"
                                                    : "text-gray-800"
                                            }`}
                                        >
                                            {a.artista}
                                        </div>

                                        {/* Bar track */}
                                        <div className="relative h-5">
                                            {/* Era background bands */}
                                            {ERAS.map((era) => (
                                                <div
                                                    key={era.name}
                                                    className="absolute top-0 bottom-0"
                                                    style={{
                                                        left: `${yearToPercent(era.start)}%`,
                                                        width: `${yearToPercent(era.end) - yearToPercent(era.start)}%`,
                                                        backgroundColor: era.color,
                                                        opacity: 0.07,
                                                    }}
                                                />
                                            ))}

                                            {/* Bar */}
                                            <div
                                                className="absolute top-0.5 bottom-0.5 rounded-sm cursor-pointer transition-all"
                                                style={{
                                                    left: `${yearToPercent(a.inicio)}%`,
                                                    width: `${yearToPercent(a.fin_real) - yearToPercent(a.inicio)}%`,
                                                    backgroundColor: "#C45A3B",
                                                    opacity: a.activo ? (isHovered ? 1 : 0.85) : (isHovered ? 0.7 : 0.45),
                                                }}
                                                onMouseEnter={() => setHovered(a)}
                                                onMouseLeave={() => setHovered(null)}
                                            />

                                            {/* Active dot at end */}
                                            {a.activo && (
                                                <div
                                                    className="absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-terracota"
                                                    style={{
                                                        left: `${yearToPercent(a.fin_real)}%`,
                                                        boxShadow: "0 0 6px rgba(196,90,59,0.6)",
                                                    }}
                                                />
                                            )}
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>

                        {/* Legend */}
                        <div className="mt-8 flex items-center gap-6 text-xs text-gray-600 justify-center flex-wrap">
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-8 rounded-sm bg-terracota"></div>
                                <span>Activo</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-2 w-8 rounded-sm bg-terracota opacity-45"></div>
                                <span>Inactivo</span>
                            </div>
                            <span className="text-gray-500">·</span>
                            <span className="text-gray-500">
                                Fondo coloreado = era musical en curso
                            </span>
                        </div>
                    </div>
                )}
                    </div>

                    {/* RIGHT 25%: empty spacer */}
                    <div className="hidden lg:block lg:w-1/4" aria-hidden="true"></div>
                </div>
            </div>

            {/* Tooltip via portal */}
            {hovered &&
                createPortal(
                    <div
                        className="fixed bg-white border border-gray-300 rounded-lg px-3 py-2 pointer-events-none shadow-xl whitespace-nowrap"
                        style={{
                            left: mousePos.x + 14,
                            top: mousePos.y + 14,
                            transform:
                                mousePos.x > window.innerWidth - 220
                                    ? "translateX(-100%) translateX(-28px)"
                                    : "none",
                            zIndex: 9999,
                        }}
                    >
                        <p className="font-bold text-gray-900 text-sm">
                            {hovered.artista}
                        </p>
                        <p className="text-terracota text-xs font-medium">
                            {hovered.inicio} – {hovered.activo ? "presente" : hovered.fin_real}
                            <span className="text-gray-600 ml-2">
                                ({hovered.fin_real - hovered.inicio} años)
                            </span>
                        </p>
                        <p className="text-gray-500 text-[10px] mt-1">{hovered.ciudad}</p>
                    </div>,
                    document.body
                )}
        </section>
    );
}
