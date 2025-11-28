"use client";

import Image from "next/image";
import { themeClasses } from "@/utils/theme";

export default function Home() {
  const images = [
    { src: "/images/homePage/crowd_illustration.jpg", alt: "Community gathering" },
    { src: "/images/homePage/group_bonfire.jpg", alt: "Friends around bonfire" },
    { src: "/images/homePage/group_hike.jpg", alt: "Group hiking together" },
    { src: "/images/homePage/music_sign.jpg", alt: "Music and connection" },
    { src: "/images/homePage/soccer_player.jpg", alt: "Active community" },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-white relative overflow-hidden">
      {/* Background Image Grid - Subtle and Minimalist */}
      <div className="absolute inset-0 z-0 opacity-5">
        <div className="grid grid-cols-3 grid-rows-3 h-full w-full">
          {images.map((img, index) => (
            <div key={index} className="relative overflow-hidden">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
          ))}
          {/* Fill remaining grid cells with repeated images */}
          {images.slice(0, 4).map((img, index) => (
            <div key={`repeat-${index}`} className="relative overflow-hidden">
              <Image
                src={img.src}
                alt={img.alt}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 33vw, 33vw"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-start pt-[10vh] px-8 pb-12">
        <div className="text-center space-y-4 max-w-3xl">
          {/* Main Header */}
          <h1 className={`${themeClasses.text.headingLarge} ${themeClasses.text.primary}`}>
            Welcome TO <span className={themeClasses.text.accent}>4RL</span>
          </h1>
          
          {/* Subheading */}
          <p className={`${themeClasses.text.bodyLarge} ${themeClasses.text.secondary} font-light`}>
            Real people. Real Connection. Real world.
          </p>
        </div>

        {/* Image Gallery - Minimalist Grid */}
        <div className="mt-10 w-full max-w-5xl px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {images.map((img, index) => (
              <div
                key={index}
                className="relative aspect-[4/5] rounded-xl overflow-hidden group cursor-pointer"
              >
                <Image
                  src={img.src}
                  alt={img.alt}
                  fill
                  className={`object-cover ${themeClasses.image.hoverOverlay}`}
                  sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action - Subtle */}
        <div className="mt-8 text-center">
          <div className="flex flex-row items-center justify-center gap-4">
            <a
              href="/signup"
              className={`inline-block ${themeClasses.button.primary}`}
            >
              Get Started
            </a>
            <a
              href="/login"
              className={`inline-block ${themeClasses.button.primary}`}
            >
              Login
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
