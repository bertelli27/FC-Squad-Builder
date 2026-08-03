import { NextResponse } from "next/server";
import { competitionService } from "@/services/competition.service";

export async function GET() {
  const competitions = await competitionService.listCompetitions();
  return NextResponse.json({ competitions });
}
