import DropToggleButton from "./DropToggleButton";
import { setDroppedInStatus } from "@/utils/supabase/lib";
import { revalidatePath } from "next/cache";

interface DropToggleCardProps {
  droppedIn: boolean;
}

export default function DropToggleCard({ droppedIn }: DropToggleCardProps) {
  async function handleToggle(formData: FormData) {
    "use server";
    const targetState = formData.get("targetState") === "true";
    await setDroppedInStatus(targetState);
    revalidatePath("/home");
  }

  return (
    <div className="rounded-3xl border border-gray-200 bg-white/80 backdrop-blur p-8 shadow-sm">
      <div className="flex flex-col gap-4 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-gray-400">Status</p>
          <h1 className="mt-3 text-4xl font-semibold text-gray-900">
            {droppedIn ? "You're dropped in" : "You're currently dropped out"}
          </h1>
          <p className="mt-2 text-gray-500">
            {droppedIn
              ? "You’re visible to other explorers right now."
              : "Tap back in when you're ready to meet up."}
          </p>
        </div>
        <form action={handleToggle} className="flex flex-col gap-3 items-center">
          <input type="hidden" name="targetState" value={(!droppedIn).toString()} />
          <DropToggleButton droppedIn={droppedIn} />
          <p className="text-xs text-gray-400">
            {droppedIn
              ? "Dropping out hides you instantly."
              : "Dropping in lets nearby people know you’re available."}
          </p>
        </form>
      </div>
    </div>
  );
}

