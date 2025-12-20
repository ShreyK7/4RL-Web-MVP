"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import DropToggleButton from "./DropToggleButton";
import { setDroppedInStatus } from "@/utils/supabase/lib";

interface DropToggleCardProps {
  droppedIn: boolean;
  userName: string;
}

export default function DropToggleCard({ droppedIn, userName }: DropToggleCardProps) {
  const router = useRouter();
  const [isToggling, setIsToggling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleToggle() {
    setIsToggling(true);
    setErrorMessage(null);
    const targetState = !droppedIn;

    try {
      if (targetState) {
        // When dropping in, get user's location
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          if (!navigator.geolocation) {
            reject(new Error("Geolocation is not supported by your browser"));
            return;
          }

          navigator.geolocation.getCurrentPosition(
            resolve,
            reject,
            {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 0,
            }
          );
        });

        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        await setDroppedInStatus(targetState, latitude, longitude);
      } else {
        // When dropping out, no location needed
        await setDroppedInStatus(targetState);
      }

      router.refresh();
    } catch (error: any) {
      console.error("Error toggling drop in status:", error);
      setErrorMessage(
        error.message || "Failed to update your status. Please try again."
      );
    } finally {
      setIsToggling(false);
    }
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm">
      <div className="flex flex-col gap-4 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Status</p>
          <h1 className="mt-3 text-4xl font-semibold text-gray-900">
            {droppedIn ? `Hi ${userName}, you're dropped in` : `Hi ${userName}, you're currently dropped out`}
          </h1>
          <p className="mt-2 text-gray-500">
            {droppedIn
              ? "You're visible to other explorers right now."
              : "Tap back in when you're ready to meet up."}
          </p>
        </div>
        <div className="flex flex-col gap-3 items-center">
          <DropToggleButton 
            droppedIn={droppedIn} 
            disabled={isToggling} 
            isLoading={isToggling}
            onClick={handleToggle}
          />
          {errorMessage && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2 max-w-md">
              {errorMessage}
            </p>
          )}
          <p className="text-xs text-gray-400">
            {droppedIn
              ? "Dropping out hides you instantly."
              : "Dropping in lets nearby people know you're available."}
          </p>
        </div>
      </div>
    </div>
  );
}

