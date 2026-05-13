import React, { useState, useEffect, useRef } from "react";
import { Helmet } from "react-helmet";
import { supabase } from "./supabaseClient";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from "recharts";

// Colores para cada género (paleta distintiva)
const GENRE_COLORS = {
    Rock: "#E63946",
    Pop: "#F4A261",
    "Electrónica": "#2A9D8F",
    Metal: "#264653",
    Experimental: "#9B5DE5",
    Punk: "#F15BB5",
    Rap: "#00BBF9",
    "Norteño": "#8B4513",
    "Reggaetón": "#00F5D4",
    Grupero: "#FEE440",
    Cumbia: "#FF6B6B",
    Jazz: "#4361EE",
    Otro: "#6B7280",
};

// Orden de eras musicales para la narrativa
const ERAS = [
    {
        id: "intro",
        title: "El Soundtrack de Monterrey",
        subtitle: "Una historia que se ha reescrito varias veces",
        years: null,
        description: "Nuevo León tiene más de 11,000 lanzamientos musicales documentados. Esta es la historia de cómo su identidad sonora ha evolucionado a través del tiempo y la geografía.",
    },
    {
        id: "origenes",
        title: "Los Orígenes",
        subtitle: "Norteño y las raíces",
        years: [1950, 1979],
        description: "La música norteña nace de la fusión de tradiciones mexicanas y europeas. El acordeón y el bajo sexto definen el sonido que identificará a la región por décadas.",
        highlightGenres: ["Norteño", "Grupero"],
    },
    {
        id: "rock-regio",
        title: "La Revolución del Rock Regio",
        subtitle: "1980s - 1990s",
        years: [1980, 1999],
        description: "Monterrey se convierte en la capital del rock en español. Bandas como El Gran Silencio, Control Machete y Plastilina Mosh ponen a la ciudad en el mapa internacional.",
        highlightGenres: ["Rock", "Metal", "Punk"],
    },
    {
        id: "diversificacion",
        title: "La Diversificación",
        subtitle: "2000s - 2010s",
        years: [2000, 2015],
        description: "La escena se fragmenta y enriquece. Surge la electrónica, el indie, y los primeros experimentos con hip-hop local.",
        highlightGenres: ["Electrónica", "Pop", "Experimental"],
    },
    {
        id: "urbano",
        title: "La Era Urbana",
        subtitle: "2016 - Presente",
        years: [2016, 2026],
        description: "El rap y el reggaetón dominan. Una nueva generación de artistas redefine qué significa ser de Monterrey.",
        highlightGenres: ["Rap", "Reggaetón", "Pop"],
    },
    {
        id: "mapa",
        title: "Geografía del Sonido",
        subtitle: "¿De dónde vienen los artistas?",
        years: null,
        description: "Explora qué municipios son semilleros de qué géneros. ¿Es San Pedro más pop? ¿El centro más rock?",
        showMap: true,
    },
];

export default function Narrativa() {
    const [genresByYear, setGenresByYear] = useState([]);
    const [citiesData, setCitiesData] = useState([]);
    const [activeEra, setActiveEra] = useState("intro");
    const [loading, setLoading] = useState(true);
    const sectionRefs = useRef({});

    // Fetch data on mount
    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                // Géneros por año
                const { data: generos, error: genErr } = await supabase
                    .from("v_generos_por_anio")
                    .select("*")
                    .order("year", { ascending: true });

                if (genErr) throw genErr;

                // Normalizar nombre de género para coincidir con GENRE_COLORS
                const normalizeGenre = (g) => {
                    if (!g) return "Otro";
                    const capitalized = g.charAt(0).toUpperCase() + g.slice(1);
                    const mapping = {
                        "Electronica": "Electrónica",
                        "Norteno": "Norteño",
                        "Reggaeton": "Reggaetón",
                    };
                    return mapping[capitalized] || capitalized;
                };

                // Obtener rango completo de años (sin gaps)
                const yearsInData = [...new Set(generos.map((g) => g.year))].sort((a, b) => a - b);
                const minYear = Math.min(...yearsInData);
                const maxYear = Math.max(...yearsInData);
                const allYears = [];
                for (let y = minYear; y <= maxYear; y++) {
                    allYears.push(y);
                }

                // Obtener todos los géneros únicos
                const allGenresInData = [...new Set(generos.map((g) => normalizeGenre(g.genero)))];

                // Crear pivote con TODOS los años y géneros inicializados a 0
                const pivoted = allYears.map((year) => {
                    const row = { year };
                    allGenresInData.forEach((genre) => {
                        row[genre] = 0;
                    });
                    generos
                        .filter((g) => g.year === year)
                        .forEach((g) => {
                            const genreKey = normalizeGenre(g.genero);
                            row[genreKey] = (row[genreKey] || 0) + g.total;
                        });
                    return row;
                });
                setGenresByYear(pivoted);

                // Artistas por ciudad
                const { data: artists, error: cityErr } = await supabase
                    .from("artistas")
                    .select("ciudad, id");

                if (!cityErr && artists) {
                    const cityCount = {};
                    artists.forEach((a) => {
                        const city = a.ciudad || "Sin especificar";
                        cityCount[city] = (cityCount[city] || 0) + 1;
                    });
                    const cityArray = Object.entries(cityCount)
                        .map(([ciudad, count]) => ({ ciudad, count }))
                        .sort((a, b) => b.count - a.count);
                    setCitiesData(cityArray);
                }
            } catch (err) {
                console.error("Error fetching narrative data:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    // Intersection Observer for scroll-triggered animations
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        setActiveEra(entry.target.dataset.era);
                    }
                });
            },
            { threshold: 0.5 }
        );

        Object.values(sectionRefs.current).forEach((ref) => {
            if (ref) observer.observe(ref);
        });

        return () => observer.disconnect();
    }, [loading]);

    // Filtrar datos por era activa
    const getFilteredData = () => {
        const era = ERAS.find((e) => e.id === activeEra);
        if (!era?.years) return genresByYear;
        return genresByYear.filter(
            (d) => d.year >= era.years[0] && d.year <= era.years[1]
        );
    };

    // Obtener géneros a destacar para la era activa
    const getHighlightedGenres = () => {
        const era = ERAS.find((e) => e.id === activeEra);
        return era?.highlightGenres || Object.keys(GENRE_COLORS);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-4 border-terracota border-t-transparent"></div>
            </div>
        );
    }

    const allGenres = Object.keys(GENRE_COLORS);
    const highlightedGenres = getHighlightedGenres();

    return (
        <div className="bg-gray-950 text-white min-h-screen">
            <Helmet>
                <title>El Soundtrack de Monterrey | Narrativa Musical NL</title>
                <meta
                    name="description"
                    content="Una narrativa visual sobre la evolución de la música en Nuevo León"
                />
            </Helmet>

            {/* Sticky visualization */}
            <div className="sticky top-0 h-screen flex items-center justify-center bg-gray-950 z-10">
                <div className="w-full max-w-5xl px-4">
                    {/* Title overlay */}
                    <div className="absolute top-8 left-8 z-20">
                        <h2 className="text-xl font-bold text-terracota font-dmserif">
                            {ERAS.find((e) => e.id === activeEra)?.title}
                        </h2>
                        <p className="text-gray-400 text-sm">
                            {ERAS.find((e) => e.id === activeEra)?.subtitle}
                        </p>
                    </div>

                    {/* Main visualization */}
                    {activeEra !== "mapa" ? (
                        <ResponsiveContainer width="100%" height={500}>
                            <AreaChart data={getFilteredData()}>
                                <XAxis
                                    dataKey="year"
                                    stroke="#666"
                                    tick={{ fill: "#999", fontSize: 12 }}
                                />
                                <YAxis
                                    stroke="#666"
                                    tick={{ fill: "#999", fontSize: 12 }}
                                    label={{
                                        value: "Lanzamientos",
                                        angle: -90,
                                        position: "insideLeft",
                                        fill: "#666",
                                    }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "#1a1a1a",
                                        border: "1px solid #333",
                                        borderRadius: "8px",
                                    }}
                                    labelStyle={{ color: "#fff" }}
                                />
                                <Legend
                                    iconType="square"
                                    wrapperStyle={{ paddingTop: "20px" }}
                                />
                                {allGenres.map((genre) => (
                                    <Area
                                        key={genre}
                                        type="monotone"
                                        dataKey={genre}
                                        stackId="1"
                                        stroke={GENRE_COLORS[genre]}
                                        fill={GENRE_COLORS[genre]}
                                        fillOpacity={
                                            highlightedGenres.includes(genre) ? 0.8 : 0.15
                                        }
                                        strokeWidth={
                                            highlightedGenres.includes(genre) ? 2 : 0.5
                                        }
                                    />
                                ))}
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        /* Map placeholder */
                        <div className="h-[500px] flex flex-col items-center justify-center border border-gray-700 rounded-lg">
                            <p className="text-gray-500 text-lg mb-4">
                                Mapa de Nuevo León (próximamente)
                            </p>
                            {/* City stats as placeholder */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl">
                                {citiesData.slice(0, 6).map((c) => (
                                    <div
                                        key={c.ciudad}
                                        className="bg-gray-800 p-4 rounded-lg text-center"
                                    >
                                        <p className="text-2xl font-bold text-terracota">
                                            {c.count}
                                        </p>
                                        <p className="text-sm text-gray-400">{c.ciudad}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable narrative sections */}
            <div className="relative z-20">
                {ERAS.map((era) => (
                    <section
                        key={era.id}
                        ref={(el) => (sectionRefs.current[era.id] = el)}
                        data-era={era.id}
                        className="min-h-screen flex items-center justify-end px-8"
                    >
                        <div className="max-w-md bg-gray-900/90 backdrop-blur-sm p-8 rounded-lg border border-gray-700">
                            <h2 className="text-3xl font-bold mb-2 font-dmserif">
                                {era.title}
                            </h2>
                            <p className="text-terracota mb-4">{era.subtitle}</p>
                            <p className="text-gray-300 leading-relaxed">
                                {era.description}
                            </p>
                            {era.highlightGenres && (
                                <div className="mt-4 flex flex-wrap gap-2">
                                    {era.highlightGenres.map((g) => (
                                        <span
                                            key={g}
                                            className="px-3 py-1 rounded-full text-sm"
                                            style={{
                                                backgroundColor: GENRE_COLORS[g],
                                                color: "#fff",
                                            }}
                                        >
                                            {g}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                ))}
            </div>

            {/* Footer */}
            <footer className="bg-gray-900 py-12 text-center text-gray-500">
                <p>
                    Datos de{" "}
                    <a href="https://monterreymusiclab.org" className="text-terracota hover:underline">
                        Monterrey Music Lab
                    </a>
                </p>
                <p className="text-sm mt-2">
                    {genresByYear.length > 0 &&
                        `${genresByYear[0]?.year} - ${genresByYear[genresByYear.length - 1]?.year}`}
                    {" · "}
                    {citiesData.reduce((acc, c) => acc + c.count, 0)} artistas
                </p>
            </footer>
        </div>
    );
}
