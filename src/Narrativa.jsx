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
import NuevoLeonMap from "./NuevoLeonMap";
import ColeccionRegia from "./ColeccionRegia";
import PuentesGeneracionales from "./PuentesGeneracionales";

// Colores para cada género (paleta distintiva, calibrada para fondo claro)
const GENRE_COLORS = {
    Rock: "#E63946",
    Pop: "#D87E3D",        // antes #F4A261 - oscurecido para fondo claro
    "Electrónica": "#2A9D8F",
    Metal: "#264653",
    Experimental: "#9B5DE5",
    Punk: "#F15BB5",
    Rap: "#0096CC",         // antes #00BBF9 - oscurecido ligeramente
    "Norteño": "#8B4513",
    "Reggaetón": "#00A88E",  // antes #00F5D4 - oscurecido para fondo claro
    Grupero: "#C9A100",      // antes #FEE440 - oscurecido para fondo claro
    Cumbia: "#E65555",       // antes #FF6B6B - oscurecido ligeramente
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
        id: "los_80s",
        title: "La Conquista del Mainstream",
        subtitle: "Los 80s: del estadio al subsuelo",
        years: [1980, 1989],
        description: "Los 80s en Nuevo León son la conquista del mainstream nacional. Bronco moderniza el norteño hasta llenar estadios, Tatiana se vuelve princesa pop adolescente, Gloria Trevi irrumpe rebelde. Mientras tanto, en el subsuelo regio, Disolución Social inventa un punk que no sería rentable hasta veinte años después. Por primera vez Monterrey no solo exporta tradición — exporta provocación.",
        highlightGenres: ["Grupero", "Pop", "Cumbia", "Punk"],
    },
    {
        id: "rock-regio",
        title: "La Avanzada Regia",
        subtitle: "El boom multi-género de los 90s",
        years: [1990, 2002],
        description: "Monterrey se convierte en epicentro de un experimento colectivo multi-género. Control Machete trae el hip-hop, El Gran Silencio mezcla cumbia con ska y rap, Plastilina Mosh inventa una electrónica con humor, Zurdok lleva el rock alternativo a su madurez. Por primera vez, 'música regia' significa muchas cosas al mismo tiempo.",
        highlightGenres: ["Rock", "Rap", "Electrónica"],
    },
    {
        id: "diversificacion",
        title: "La Diversificación",
        subtitle: "2000s - 2010s",
        years: [2001, 2015],
        description: "Pasada la euforia de la Avanzada, la escena se atomiza. Sellos independientes, festivales nicho, MySpace y luego Bandcamp permiten que un proyecto de garage llegue a oídos en Buenos Aires o Berlín. Ya no hay un sonido regio — hay muchos sonidos regios simultáneos.",
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
];

export default function Narrativa() {
    const [genresByYear, setGenresByYear] = useState([]);
    const [citiesData, setCitiesData] = useState([]);
    const [activeEra, setActiveEra] = useState("intro");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
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

                // Artistas por ciudad — paginado porque Supabase limita a 1000 por request
                const allArtists = [];
                const pageSize = 1000;
                let from = 0;
                while (true) {
                    const { data: chunk, error: cityErr } = await supabase
                        .from("artistas")
                        .select("ciudad, id")
                        .range(from, from + pageSize - 1);
                    if (cityErr || !chunk || chunk.length === 0) break;
                    allArtists.push(...chunk);
                    if (chunk.length < pageSize) break;
                    from += pageSize;
                }

                if (allArtists.length > 0) {
                    const cityCount = {};
                    allArtists.forEach((a) => {
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
                setError("No se pudieron cargar los datos. Verifica tu conexión e intenta de nuevo.");
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

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
                <div className="text-center max-w-md px-6">
                    <p className="text-4xl mb-4">🎵</p>
                    <h2 className="text-xl font-bold mb-2 font-dmserif">Algo salió mal</h2>
                    <p className="text-gray-400 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-terracota text-white rounded-lg hover:opacity-90 transition-opacity"
                    >
                        Reintentar
                    </button>
                </div>
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

            {/* Hero Section */}
            <section className="relative h-screen flex items-center justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-cover bg-center bg-no-repeat"
                    style={{
                        backgroundImage:
                            "url('https://images.unsplash.com/photo-1561158250-01426799e9e0?auto=format&fit=crop&w=1920&q=80')",
                    }}
                />
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-gray-950" />
                <div className="relative z-10 text-center max-w-3xl px-6">
                    <h1 className="text-5xl md:text-7xl font-bold font-dmserif mb-6 leading-tight">
                        El Soundtrack de Monterrey
                    </h1>
                    <p className="text-xl md:text-2xl text-gray-300 italic font-light leading-relaxed max-w-2xl mx-auto">
                        Cómo una región se ha cantado a sí misma desde 1961
                    </p>
                    <p className="text-gray-500 text-sm mt-10 tracking-wide">
                        11,000+ lanzamientos · 1,185 artistas · 5 reinvenciones
                    </p>
                </div>
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-6 w-6 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </section>

            {/* Sección 2 — La Pregunta */}
            <section className="relative bg-gray-950 py-32 md:py-36 px-6">
                <div className="max-w-3xl mx-auto text-center">
                    <p className="text-terracota text-xs uppercase tracking-[0.3em] mb-16 font-medium">
                        La pregunta
                    </p>

                    <p className="text-lg md:text-xl text-gray-400 leading-relaxed mb-10">
                        Una base de datos no parece el lugar para encontrar identidad.
                        Más de once mil entradas, casi mil doscientos artistas, fechas,
                        géneros, links a Spotify. Pero los datos no son neutrales:&nbsp;
                        <span className="underline">son una manera de recordar</span>.
                    </p>

                    <p className="text-xl md:text-2xl text-gray-300 mb-12 leading-relaxed italic font-light">
                        Esta es una pregunta sobre memoria colectiva.
                    </p>

                    <blockquote className="relative my-16">
                        <span
                            aria-hidden="true"
                            className="absolute -top-8 left-1/2 -translate-x-1/2 text-terracota text-7xl font-dmserif opacity-40 select-none"
                        >
                            "
                        </span>
                        <p className="text-3xl md:text-5xl font-dmserif text-white leading-snug px-4 relative z-10">
                            ¿Qué nos cuenta la base de datos musical de Nuevo León
                            sobre cómo la región ha imaginado su propia identidad?
                        </p>
                    </blockquote>

                    <p className="text-lg md:text-xl text-gray-400 leading-relaxed mt-16">
                        No buscamos las canciones favoritas. Buscamos los patrones:
                        qué se repite, qué desaparece, qué emerge. Cada era trae una
                        pregunta colectiva distinta — y los datos la registran sin saberlo.
                    </p>
                </div>
            </section>

            {/* Light theme wrapper - Sección 3: Eras scrollytelling (two-column) */}
            <div className="bg-[#f5f0e6] text-gray-900 relative">
                <div className="flex flex-col-reverse lg:flex-row relative">

                    {/* LEFT 25%: scrolling narrative text */}
                    <div className="lg:w-1/4 relative z-20">
                        {ERAS.filter((era) => era.id !== "intro").map((era) => (
                            <section
                                key={era.id}
                                ref={(el) => (sectionRefs.current[era.id] = el)}
                                data-era={era.id}
                                className="min-h-screen flex items-center px-6 sm:px-10 lg:px-8 py-16"
                            >
                                <div>
                                    <p className="text-terracota text-xs uppercase tracking-widest mb-4 font-medium">
                                        {era.subtitle}
                                    </p>
                                    <p className="text-gray-700 leading-relaxed">
                                        {era.description}
                                    </p>
                                    {era.highlightGenres && (
                                        <div className="mt-6 flex flex-wrap gap-2">
                                            {era.highlightGenres.map((g) => (
                                                <span
                                                    key={g}
                                                    className="px-3 py-1 rounded-full text-xs font-medium"
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

                    {/* CENTER 50%: sticky chart with centered title */}
                    <div className="lg:w-1/2 relative">
                        <div className="lg:sticky lg:top-0 h-screen flex flex-col items-center justify-center bg-[#f5f0e6] px-4 py-12">
                            {/* Centered title (updates with active era) */}
                            <div className="text-center mb-6 w-full transition-opacity duration-300">
                                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 font-dmserif mb-2">
                                    {ERAS.find((e) => e.id === activeEra)?.title}
                                </h2>
                                {(() => {
                                    const a = ERAS.find((e) => e.id === activeEra);
                                    if (!a?.years) return null;
                                    return (
                                        <p className="text-terracota text-sm uppercase tracking-widest font-medium">
                                            {a.years[0]} – {a.years[1]}
                                        </p>
                                    );
                                })()}
                            </div>

                            {/* Chart centered */}
                            <div className="w-full">
                                <ResponsiveContainer width="100%" height={400}>
                                    <AreaChart data={getFilteredData()}>
                                        <XAxis
                                            dataKey="year"
                                            stroke="#52525b"
                                            tick={{ fill: "#52525b", fontSize: 12 }}
                                        />
                                        <YAxis
                                            stroke="#52525b"
                                            tick={{ fill: "#52525b", fontSize: 12 }}
                                            label={{
                                                value: "Lanzamientos",
                                                angle: -90,
                                                position: "insideLeft",
                                                fill: "#52525b",
                                            }}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: "#ffffff",
                                                border: "1px solid #d4d4d8",
                                                borderRadius: "8px",
                                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                            }}
                                            labelStyle={{ color: "#1a1a1a", fontWeight: 600 }}
                                        />
                                        <Legend
                                            iconType="square"
                                            wrapperStyle={{ paddingTop: "20px", color: "#52525b" }}
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
                                                    highlightedGenres.includes(genre) ? 0.8 : 0.12
                                                }
                                                strokeWidth={
                                                    highlightedGenres.includes(genre) ? 2 : 0.5
                                                }
                                            />
                                        ))}
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT 25%: empty spacer (Pudding-style breathing room) */}
                    <div className="hidden lg:block lg:w-1/4" aria-hidden="true"></div>

                </div>
            </div>

            {/* Colección Regia - galería de portadas */}
            <ColeccionRegia />

            {/* Sección 5: Geografía del Sonido */}
            <section className="relative bg-[#f5f0e6] text-gray-900 py-24 z-30">
                <div>
                    {/* Header (centered) */}
                    <div className="text-center mb-12">
                        <p className="text-terracota text-sm uppercase tracking-widest mb-2 font-medium">
                            Geografía
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold font-dmserif text-gray-900">
                            Geografía del Sonido
                        </h2>
                    </div>

                    {/* 3-column layout: text-left 25%, map-center 50%, empty-right 25% */}
                    <div className="flex flex-col lg:flex-row">
                        {/* LEFT 25%: narrative text */}
                        <div className="lg:w-1/4 px-6 lg:px-8 mb-10 lg:mb-0">
                            <div className="lg:sticky lg:top-20 text-gray-700 leading-relaxed space-y-4">
                                <p>
                                    Si abres Spotify y filtras tus regios favoritos por
                                    origen, casi todos dirán "Monterrey". Pero los datos
                                    cuentan otra cosa.
                                </p>
                                <p>
                                    Carlos y José son de <strong className="text-gray-900">Los Ramones</strong>.
                                    Los Cadetes son de <strong className="text-gray-900">Linares</strong>.
                                    The Warning es de <strong className="text-gray-900">San Pedro</strong>.
                                    3BallMTY es de <strong className="text-gray-900">San Nicolás</strong>.
                                    Antonio Tanguma — desde 1914 — es de <strong className="text-gray-900">China, Nuevo León</strong>.
                                </p>
                                <p>
                                    La música regia nunca fue solo de Monterrey. Es de
                                    Nuevo León entero. Pero la concentración demográfica
                                    de la AMM ha vuelto invisible esa diversidad geográfica.{" "}
                                    <em>Este mapa la regresa al frente.</em>
                                </p>
                            </div>
                        </div>

                        {/* CENTER 50%: map */}
                        <div className="lg:w-1/2 flex flex-col items-center">
                            <NuevoLeonMap
                                citiesData={citiesData}
                                width={600}
                                height={450}
                            />
                            <p className="text-center text-gray-600 text-sm mt-8">
                                {citiesData.length} municipios · {citiesData.reduce((acc, c) => acc + c.count, 0)} artistas documentados
                            </p>
                        </div>

                        {/* RIGHT 25%: empty spacer */}
                        <div className="hidden lg:block lg:w-1/4" aria-hidden="true"></div>
                    </div>
                </div>
            </section>

            {/* Sección 6: Puentes Generacionales */}
            <PuentesGeneracionales />

            {/* Sección 7: Reflexión */}
            <section className="relative bg-gray-950 text-white py-32 md:py-40 px-6 z-30">
                <div className="max-w-3xl mx-auto">
                    {/* Eyebrow */}
                    <div className="text-center mb-16">
                        <p className="text-terracota text-sm uppercase tracking-widest mb-2 font-medium">
                            Reflexión
                        </p>
                        <p className="text-lg md:text-xl text-gray-400 leading-relaxed">
                            Cinco eras. Veinticinco álbumes. Cincuenta y un municipios. Once mil lanzamientos.
                        </p>
                        <p className="text-2xl md:text-3xl text-gray-100 mt-8 leading-snug italic font-light font-dmserif">
                            ¿Qué dice todo esto sobre la identidad sonora de Nuevo León?
                        </p>
                    </div>

                    {/* Tres lecturas */}
                    <div className="space-y-14 mt-20">
                        <div>
                            <p className="text-terracota text-sm uppercase tracking-[0.25em] mb-4 font-medium">
                                Uno
                            </p>
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                                La música regia no es un género. Es una tensión
                                productiva entre tradición y experimento — el norteño
                                que persiste mientras el rap se inventa, mientras el
                                indie florece, mientras el pop se globaliza.{" "}
                                <strong className="text-white font-semibold">
                                    Coexisten, no se reemplazan.
                                </strong>
                            </p>
                        </div>

                        <div>
                            <p className="text-terracota text-sm uppercase tracking-[0.25em] mb-4 font-medium">
                                Dos
                            </p>
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                                Monterrey-ciudad ha eclipsado al resto del estado en
                                visibilidad, pero los datos guardan memoria de los
                                semilleros —{" "}
                                <strong className="text-white font-semibold">
                                    Linares, General Terán, San Pedro, China
                                </strong>{" "}
                                — donde nació mucho de lo que después se etiquetó como
                                "de Monterrey".
                            </p>
                        </div>

                        <div>
                            <p className="text-terracota text-sm uppercase tracking-[0.25em] mb-4 font-medium">
                                Tres
                            </p>
                            <p className="text-lg md:text-xl text-gray-300 leading-relaxed">
                                Lo que llamamos "soundtrack" no es la música más
                                escuchada. Es la música que tú recuerdas{" "}
                                <em>mientras</em> la escuchas. Esta es una memoria
                                colectiva ensamblada desde una base de datos: parcial,
                                sesgada, pero{" "}
                                <strong className="text-white font-semibold">
                                    defendible como un primer borrador
                                </strong>
                                .
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Sección 8: Metodología */}
            <section className="relative bg-gray-950 text-white py-32 px-6 z-30 border-t border-gray-800">
                <div className="max-w-3xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-16">
                        <p className="text-terracota text-sm uppercase tracking-widest mb-2 font-medium">
                            Detrás del dato
                        </p>
                        <h2 className="text-3xl md:text-4xl font-bold font-dmserif text-white">
                            Metodología
                        </h2>
                    </div>

                    {/* Content blocks */}
                    <div className="space-y-12 text-gray-300 leading-relaxed">
                        <div>
                            <h3 className="text-terracota text-xs uppercase tracking-widest mb-3 font-medium">
                                Fuente de datos
                            </h3>
                            <p>
                                Los 11,000+ lanzamientos y 1,185 artistas provienen de{" "}
                                <a
                                    href="https://monterreymusiclab.org"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white underline decoration-terracota underline-offset-4 hover:text-terracota transition-colors"
                                >
                                    Monterrey Music Lab
                                </a>
                                , proyecto independiente que cataloga música identificable como originaria de
                                Nuevo León, principalmente disponible en plataformas digitales.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-terracota text-xs uppercase tracking-widest mb-3 font-medium">
                                Límites a reconocer
                            </h3>
                            <ul className="space-y-3">
                                <li>
                                    <strong className="text-white font-semibold">Sesgo de plataforma:</strong>{" "}
                                    Solo se cataloga lo que tiene huella digital. Música anterior a 1990 está
                                    sub-representada si nunca llegó a Spotify, Apple Music o YouTube. Esto
                                    explica por qué Los Cadetes de Linares aparecen primero en 1995 aunque su
                                    carrera empezó en los 60s.
                                </li>
                                <li>
                                    <strong className="text-white font-semibold">Definición de "regio":</strong>{" "}
                                    Un artista se considera de Nuevo León si su origen documentado lo es.
                                    No incluye colaboradores, migrantes, ni artistas adoptados.
                                </li>
                                <li>
                                    <strong className="text-white font-semibold">Géneros simplificados:</strong>{" "}
                                    La taxonomía proviene de etiquetas de Spotify reducidas. Géneros nicho como
                                    "tribal guarachero" aparecen como "Rock" o "Pop". Reconocemos esta pérdida
                                    de granularidad.
                                </li>
                                <li>
                                    <strong className="text-white font-semibold">Curaduría editorial:</strong>{" "}
                                    Los 25 álbumes de La Colección Regia son una selección con criterio
                                    histórico documentado, no de gusto personal.
                                </li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="text-terracota text-xs uppercase tracking-widest mb-3 font-medium">
                                Fuentes de curaduría
                            </h3>
                            <p>
                                Rolling Stone México · Indie Rocks · Wikipedia (cánones regionales) ·
                                Archivos de prensa musical de los 90s (La Mosca, Switch).
                            </p>
                        </div>

                        <div>
                            <h3 className="text-terracota text-xs uppercase tracking-widest mb-3 font-medium">
                                Tecnologías y datos externos
                            </h3>
                            <p>
                                React · Vite · Supabase · Recharts · d3-geo · Tailwind CSS.
                            </p>
                            <p className="mt-3">
                                <strong className="text-white font-semibold">Geografía:</strong> GeoJSON de los
                                51 municipios de Nuevo León desde{" "}
                                <a
                                    href="https://github.com/PhantomInsights/mexico-geojson"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white underline decoration-terracota underline-offset-4 hover:text-terracota transition-colors"
                                >
                                    PhantomInsights/mexico-geojson
                                </a>{" "}
                                (shapefiles CONABIO 2023).
                            </p>
                            <p className="mt-3">
                                <strong className="text-white font-semibold">Imagen de hero:</strong> Cerro de
                                la Silla, Jorge Gardner vía Unsplash.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-terracota text-xs uppercase tracking-widest mb-3 font-medium">
                                Código abierto
                            </h3>
                            <p>
                                <a
                                    href="https://github.com/jrehlaender91/narrativa-musical-nl"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-white underline decoration-terracota underline-offset-4 hover:text-terracota transition-colors"
                                >
                                    github.com/jrehlaender91/narrativa-musical-nl
                                </a>
                            </p>
                        </div>
                    </div>

                    {/* Final credit */}
                    <div className="mt-20 pt-12 border-t border-gray-800 text-center text-gray-500 text-sm">
                        <p>Proyecto desarrollado para el curso de Humanidades Digitales.</p>
                        <p className="mt-2">J. Rehlaender · 2026</p>
                    </div>
                </div>
            </section>

            {/* Footer minimalista */}
            <footer className="relative z-30 bg-gray-950 py-6 text-center text-gray-600 text-xs">
                <p>© 2026 · El Soundtrack de Monterrey</p>
            </footer>
        </div>
    );
}
