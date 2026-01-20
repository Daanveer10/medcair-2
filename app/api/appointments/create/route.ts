import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.json();
  const { patient_id, clinic_id, doctor_id, slot_id } = body;

  // Check slot
  const { data: slot } = await supabaseAdmin
    .from("appointment_slots")
    .select("is_available")
    .eq("id", slot_id)
    .single();

  if (!slot || !slot.is_available) {
    return NextResponse.json({ error: "Slot not available" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("appointments")
    .insert({
      patient_id,
      clinic_id,
      doctor_id,
      slot_id,
      status: "scheduled",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabaseAdmin
    .from("appointment_slots")
    .update({ is_available: false })
    .eq("id", slot_id);

  return NextResponse.json({ success: true, appointment: data });
}
