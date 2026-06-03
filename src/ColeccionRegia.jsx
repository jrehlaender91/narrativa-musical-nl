import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";

// Curaduría: 20 álbumes históricamente importantes (5 por era).
// IDs corresponden a la tabla `lanzamientos`.
const ERAS = [
    {
        id: "origenes",
        title: "Orígenes",
        range: "1950 – 1979",
        icon: "🌵",
        ids: [11393, 13204, 12308, 11790, 18761],
    },
    {
        id: "los_80s",
        title: "La Conquista del Mainstream",
        range: "1980 – 1989",
        icon: "📺",
        // Bronco 1982, Tatiana 1984, Los Mier 1985, Disolución Social 1988, Gloria Trevi 1989
        ids: [16287, 12029, 18494, 8729, 12338],
    },
    {
        id: "avanzada",
        title: "La Avanzada Regia",
        range: "1990 – 2002",
        icon: "🎸",
        // Control Machete 1997, El Gran Silencio 1998, Plastilina Mosh 1998, Jumbo 1999, Zurdok 2000
        ids: [7152, 15897, 7149, 7146, 8],
    },
    {
        id: "diversificacion",
        title: "Diversificación",
        range: "2001 – 2015",
        icon: "🎛",
        // Celso Piña Barrio Bravo 2001, Kinky 2002, She's A Tease 2010, Bam Bam 2011, 3BallMTY Inténtalo 2011
        ids: [12435, 15727, 15982, 932, 1064],
    },
    {
        id: "nueva_era",
        title: "La Nueva Era",
        range: "2016 – presente",
        icon: "🎤",
        // Pirámides 2016, HUMBE AURORA 2021, Kevis & Maykyy 2021, The Warning ERROR 2022, Nsqk ATP 2024
        ids: [12454, 9118, 16954, 5732, 13667],
    },
];

const ALL_IDS = ERAS.flatMap((e) => e.ids);

export default function ColeccionRegia() {
    const [albums, setAlbums] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchAlbums() {
            try {
                const { data, error: lzErr } = await supabase
                    .from("lanzamientos")
                    .select("id, nombre, año, genero, tipo, imagen_url, spotify_url, artista_id")
                    .in("id", ALL_IDS);

                if (lzErr) throw lzErr;
                if (!data || data.length === 0) throw new Error("Sin datos");

                // Fetch artist names
                const artistIds = [...new Set(data.map((d) => d.artista_id))];
                const { data: artistsData, error: artErr } = await supabase
                    .from("artistas")
                    .select("id, artista")
                    .in("id", artistIds);

                if (artErr) throw artErr;

                const artistsMap = {};
                artistsData?.forEach((a) => (artistsMap[a.id] = a.artista));

                const lookup = {};
                data.forEach((a) => {
                    lookup[a.id] = {
                        ...a,
                        artista: artistsMap[a.artista_id] || "?",
                    };
                });
                setAlbums(lookup);
            } catch (err) {
                console.error("Error fetching colección:", err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchAlbums();
    }, []);

    return (
        <section className="relative bg-[#f5f0e6] text-gray-900 py-24 z-30">
            <div>
                {/* Section header (centered) */}
                <div className="text-center mb-12">
                    <p className="text-terracota text-sm uppercase tracking-widest font-medium mb-2">
                        Galería
                    </p>
                    <h2 className="text-3xl md:text-4xl font-bold font-dmserif text-gray-900">
                        La Colección Regia
                    </h2>   
                </div>

                {loading && (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-10 w-10 border-2 border-terracota border-t-transparent"></div>
                    </div>
                )}

                {error && (
                    <p className="text-center text-gray-500 py-12">
                        No se pudo cargar la colección.
                    </p>
                )}

                {!loading && !error && (
                    /* 3-column layout: text-left 25%, grid-center 50%, empty-right 25% */
                    <div className="flex flex-col lg:flex-row">
                        {/* LEFT 25%: description + footnote */}
                        <div className="lg:w-1/4 px-6 lg:px-8 mb-10 lg:mb-0">
                            <div className="lg:sticky lg:top-20">
                                <p className="text-gray-700 leading-relaxed mb-4">
                                    Los datos cuentan tendencias. Los álbumes cuentan momentos.
                                    Estas 20 portadas son una curaduría — cinco por era —
                                    seleccionadas por su cobertura en prensa especializada,
                                    su valor como cruce de géneros, y su persistencia en
                                    la memoria colectiva regional.
                                </p>
                                <p className="text-gray-500 text-sm italic">
                                    Da clic en cualquiera para escucharla en Spotify.
                                </p>
                            </div>
                        </div>

                        {/* CENTER 50%: era grid */}
                        <div className="lg:w-1/2 lg:max-w-xl mx-auto space-y-12">
                            {ERAS.map((era) => (
                                <div key={era.id}>
                                    {/* Era header */}
                                    <div className="flex items-baseline justify-between mb-4 border-b border-gray-300 pb-2">
                                        <h3 className="text-xl font-dmserif text-gray-900">
                                            <span className="mr-2">{era.icon}</span>
                                            {era.title}
                                        </h3>
                                        <span className="text-gray-600 text-[10px] uppercase tracking-widest">
                                            {era.range}
                                        </span>
                                    </div>

                                    {/* 5 covers grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                                        {era.ids.map((id) => (
                                            <AlbumCard key={id} album={albums[id]} />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* RIGHT 25%: empty spacer */}
                        <div className="hidden lg:block lg:w-1/4" aria-hidden="true"></div>
                    </div>
                )}

                {/* Footnote */}
                <p className="text-center text-gray-500 text-xs mt-16 max-w-xl mx-auto">
                    Criterios: significancia histórica documentada en prensa especializada
                    (Rolling Stone México, Indie Rocks) + cobertura cronológica de cada era +
                    diversidad geográfica del estado.
                </p>
            </div>
        </section>
    );
}

function AlbumCard({ album }) {
    if (!album) {
        return <div className="aspect-square bg-gray-200 rounded-md animate-pulse" />;
    }

    return (
        <a
            href={album.spotify_url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="group block cursor-pointer"
            aria-label={`${album.nombre} de ${album.artista}, ${album.año}`}
        >
            {/* Cover with hover overlay */}
            <div className="relative aspect-square overflow-hidden rounded-md bg-gray-200 mb-2 shadow-md group-hover:shadow-xl transition-shadow duration-300">
                {album.imagen_url ? (
                    <img
                        src={album.imagen_url}
                        alt={`Portada de ${album.nombre}`}
                        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-110"
                        loading="lazy"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-5xl">
                        ♪
                    </div>
                )}

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                    <p className="text-terracota text-[10px] font-bold uppercase tracking-wider mb-1">
                        {album.genero || "—"}
                    </p>
                    <p className="text-white font-bold text-sm leading-tight">
                        {album.nombre}
                    </p>
                    {album.spotify_url && (
                        <p className="text-gray-400 text-[10px] mt-2 flex items-center gap-1">
                            <span>▶</span> Escuchar en Spotify
                        </p>
                    )}
                </div>
            </div>

            {/* Below cover: artist + year (always visible) */}
            <div>
                <p className="text-gray-900 text-xs font-medium truncate leading-tight">
                    {album.artista}
                </p>
                <p className="text-gray-500 text-[10px]">{album.año}</p>
            </div>
        </a>
    );
}
