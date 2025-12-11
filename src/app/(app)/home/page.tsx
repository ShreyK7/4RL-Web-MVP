import DropToggleCard from "@/components/home/DropToggleCard";
import DroppedInSearchSection from "@/components/home/DroppedInSearchSection";
import ConnectionsPanel from "@/components/home/ConnectionsPanel";
import UserMenu from "@/components/home/UserMenu";
import { getDroppedInStatus, getProfileData, getProfilePhotoUrl } from "@/utils/supabase/lib";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const droppedIn = await getDroppedInStatus();
  const profileData = await getProfileData();
  const profilePhotoUrl = await getProfilePhotoUrl();
  const firstName = profileData?.first_name ? String(profileData.first_name) : "there";
  const fullName = profileData?.first_name && profileData?.last_name 
    ? `${String(profileData.first_name)} ${String(profileData.last_name)}`
    : profileData?.first_name 
    ? String(profileData.first_name)
    : "there";

  return (
    <main className="min-h-screen bg-white px-4 py-12 lg:px-8">
      <div className="fixed top-4 right-4 lg:top-8 lg:right-8 z-40">
        <UserMenu userName={fullName} photoUrl={profilePhotoUrl} profileData={profileData} />
      </div>
      <div className="max-w-5xl mx-auto space-y-10">
        <div>
          <p className="text-sm uppercase tracking-[0.4em] text-gray-400">Live</p>
          <h1 className="mt-2 text-4xl font-bold text-gray-900">Your map, right now.</h1>
          <p className="mt-2 text-gray-500">
            Stay spontaneous—drop in when you're free, drop out when you need space.
          </p>
        </div>

        <DropToggleCard droppedIn={droppedIn} userName={firstName} />

        {droppedIn ? <DroppedInSearchSection /> : <ConnectionsPanel />}
      </div>
    </main>
  );
}

