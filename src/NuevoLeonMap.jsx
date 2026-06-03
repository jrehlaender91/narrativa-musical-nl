import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { geoMercator, geoPath } from "d3-geo";

// Normaliza nombres para hacer match con datos de artistas (sin acentos, lowercase)
const normalize = (s) =>
    (s || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .trim();

// Aliases para corregir errores tipográficos comunes en la DB de artistas
const CITY_ALIASES = {
    "monterrrey": "monterrey",  // typo común
    "mty": "monterrey",
    "san pedro": "san pedro garza garcia",
    "san nicolas": "san nicolas de los garza",
    "garza garcia": "san pedro garza garcia",
};

export default function NuevoLeonMap({ citiesData = [], width = 700, height = 500 }) {
    const [geoData, setGeoData] = useState(null);
    const [hovered, setHovered] = useState(null);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        fetch("/nuevo-leon.json")
            .then((r) => r.json())
            .then(setGeoData)
            .catch((err) => console.error("Error loading map:", err));
    }, []);

    // Lookup table: nombre normalizado -> count (con corrección de aliases)
    const countsByMuni = useMemo(() => {
        const map = {};
        citiesData.forEach((c) => {
            const n = normalize(c.ciudad);
            const key = CITY_ALIASES[n] || n;
            map[key] = (map[key] || 0) + c.count;
        });
        return map;
    }, [citiesData]);

    // Crear proyección que ajuste al bounding box del GeoJSON
    const { pathGenerator, features, maxCount } = useMemo(() => {
        if (!geoData) return { pathGenerator: null, features: [], maxCount: 0 };

        const projection = geoMercator().fitSize([width, height], geoData);
        const path = geoPath().projection(projection);

        const enrichedFeatures = geoData.features.map((f) => ({
            ...f,
            count: countsByMuni[normalize(f.properties.NOMGEO)] || 0,
        }));

        const max = Math.max(...enrichedFeatures.map((f) => f.count), 1);

        return { pathGenerator: path, features: enrichedFeatures, maxCount: max };
    }, [geoData, width, height, countsByMuni]);

    // Escala de color logarítmica con mínimo visible
    // Garantiza que CUALQUIER municipio con ≥1 artista se distinga del vacío,
    // incluso cuando un municipio (Monterrey) domina con muchos más artistas.
    const getFill = (count) => {
        if (count === 0) return "#e8e3d6"; // beige muy claro = sin artistas
        // log scale + piso mínimo del 30% para asegurar visibilidad
        const logIntensity = Math.log(count + 1) / Math.log(maxCount + 1);
        const intensity = Math.max(0.3, logIntensity);
        // Interpolar de #e8e3d6 (232,227,214) a #C45A3B (196,90,59)
        const r = Math.round(232 + (196 - 232) * intensity);
        const g = Math.round(227 + (90 - 227) * intensity);
        const b = Math.round(214 + (59 - 214) * intensity);
        return `rgb(${r}, ${g}, ${b})`;
    };

    if (!geoData) {
        return (
            <div
                className="flex items-center justify-center"
                style={{ width, height }}
            >
                <div className="animate-spin rounded-full h-8 w-8 border-2 border-terracota border-t-transparent"></div>
            </div>
        );
    }

    // Coordenadas relativas al viewport (no al contenedor) para usar con portal
    const handleMouseMove = (e) => {
        setMousePos({ x: e.clientX, y: e.clientY });
    };

    return (
        <div
            className="relative"
            style={{ width, height }}
            onMouseMove={handleMouseMove}
        >
            <svg width={width} height={height} className="overflow-visible">
                <g>
                    {features.map((feature) => {
                        const isHovered =
                            hovered && hovered.properties.CVE_MUN === feature.properties.CVE_MUN;
                        return (
                            <path
                                key={feature.properties.CVE_MUN}
                                d={pathGenerator(feature)}
                                fill={getFill(feature.count)}
                                stroke={isHovered ? "#1a1a1a" : "#f5f0e6"}
                                strokeWidth={isHovered ? 1.5 : 0.6}
                                style={{ cursor: "pointer", transition: "stroke 150ms" }}
                                onMouseEnter={() => setHovered(feature)}
                                onMouseLeave={() => setHovered(null)}
                            />
                        );
                    })}
                </g>
            </svg>

            {/* Tooltip vía portal — escapa el stacking context del sticky */}
            {hovered &&
                createPortal(
                    <div
                        className="fixed bg-white border border-gray-300 rounded-lg px-3 py-2 pointer-events-none shadow-xl whitespace-nowrap"
                        style={{
                            left: mousePos.x + 14,
                            top: mousePos.y + 14,
                            transform:
                                mousePos.x > window.innerWidth - 180
                                    ? "translateX(-100%) translateX(-28px)"
                                    : "none",
                            zIndex: 9999,
                        }}
                    >
                        <p className="font-bold text-gray-900 text-sm">
                            {hovered.properties.NOMGEO}
                        </p>
                        <p className="text-terracota text-xs font-medium">
                            {hovered.count}{" "}
                            {hovered.count === 1 ? "artista" : "artistas"}
                        </p>
                    </div>,
                    document.body
                )}

            {/* Legend */}
            <div className="absolute bottom-0 right-0 flex items-center gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1.5">
                    <div className="h-3 w-3 rounded-sm border border-gray-300" style={{ backgroundColor: "#e8e3d6" }} />
                    <span>0</span>
                </div>
                <div className="flex items-center gap-1.5 ml-2">
                    <span>1</span>
                    <div
                        className="h-2 w-24 rounded border border-gray-300"
                        style={{
                            background:
                                "linear-gradient(to right, rgb(221, 186, 167), rgb(214, 158, 137), #C45A3B)",
                        }}
                    />
                    <span>{maxCount}+</span>
                </div>
            </div>
        </div>
    );
}
