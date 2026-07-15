import { NextRequest } from "next/server";

function authedRequest(url: string, orgId: string, init: RequestInit = {}, role = "owner") {
  const headers = new Headers(init.headers);
  headers.set("x-user-id", "smoke-user-queue-001");
  headers.set("x-org-id", orgId);
  headers.set("x-user-role", role);
  const nextInit = { ...init, headers } as ConstructorParameters<typeof NextRequest>[1];
  return new NextRequest(url, nextInit);
}

async function main() {
  process.env.OPERATORLAYER_TEST_AUTH_BYPASS = process.env.OPERATORLAYER_TEST_AUTH_BYPASS ?? "1";
  process.env.OPERATORLAYER_ALLOW_TEST_BYPASS = process.env.OPERATORLAYER_ALLOW_TEST_BYPASS ?? "1";
  process.env.OPERATORLAYER_DATA_BACKEND = process.env.OPERATORLAYER_DATA_BACKEND ?? "memory";
  process.env.OPERATORLAYER_PROCESSING_MODE = process.env.OPERATORLAYER_PROCESSING_MODE ?? "deterministic";
  process.env.OPERATORLAYER_INLINE_JOB_RUNNER = "0";

  const { POST: createOrganisation } = await import("@/app/api/organisations/route");
  const { POST: uploadSource } = await import("@/app/api/sources/upload/route");
  const { GET: listJobs } = await import("@/app/api/jobs/route");
  const { POST: replayJob } = await import("@/app/api/jobs/[id]/replay/route");
  const { POST: runWorker } = await import("@/app/api/jobs/worker/route");
  const { GET: getReadinessBoard } = await import("@/app/api/enterprise/readiness-board/route");
  const { getRepository } = await import("@/lib/repository");
  const { resetMemoryRepository } = await import("@/lib/repository/memory");

  resetMemoryRepository();

  const create = await createOrganisation(
    new NextRequest("http://localhost/api/organisations", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-user-id": "smoke-user-queue-001" },
      body: JSON.stringify({ name: "Queue Replay Smoke Org", industry: "SaaS" }),
    })
  );
  if (!create.ok) throw new Error("Failed to create organisation for queue replay smoke.");
  const org = (await create.json()) as { data: { id: string } };
  const orgId = org.data.id;

  const form = new FormData();
  form.set("title", "Queue Replay Manual");
  form.set("sourceType", "pasted_text");
  form.set("authorityLevel", "high");
  form.set("pastedText", "Price concern acknowledged. Offer scoped pilot and next step.");

  const upload = await uploadSource(
    authedRequest("http://localhost/api/sources/upload", orgId, {
      method: "POST",
      body: form,
    })
  );
  if (!upload.ok) throw new Error("Failed to upload source for queue replay smoke.");

  const jobsResponse = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
  if (!jobsResponse.ok) throw new Error("Failed to list jobs for queue replay smoke.");
  const jobsPayload = (await jobsResponse.json()) as {
    data: Array<{ id: string; status: string; jobType: string }>;
  };
  const extractionJob = jobsPayload.data.find((job) => job.jobType === "source_extraction");
  if (!extractionJob) throw new Error("Expected queued source_extraction job.");

  const repository = getRepository();
  await repository.updateJob({
    jobId: extractionJob.id,
    organisationId: orgId,
    status: "dead_letter",
    errorMessage: "simulated_disaster_dead_letter",
  });

  const beforeReplayBoard = await getReadinessBoard(
    authedRequest("http://localhost/api/enterprise/readiness-board", orgId)
  );
  if (!beforeReplayBoard.ok) throw new Error("Failed to fetch readiness board before replay.");
  const beforeReplayPayload = (await beforeReplayBoard.json()) as {
    data: { blockers: Array<{ code: string }> };
  };
  if (!beforeReplayPayload.data.blockers.some((item) => item.code === "queue_dead_letter_backlog")) {
    throw new Error("Expected queue_dead_letter_backlog before replay.");
  }

  const replay = await replayJob(
    authedRequest(`http://localhost/api/jobs/${extractionJob.id}/replay`, orgId, { method: "POST" }),
    { params: Promise.resolve({ id: extractionJob.id }) }
  );
  if (!replay.ok) throw new Error("Failed to replay dead-letter job.");

  const worker = await runWorker(
    authedRequest("http://localhost/api/jobs/worker?max=1", orgId, { method: "POST" })
  );
  if (!worker.ok) throw new Error("Failed to run worker after replay.");

  const afterReplayJobs = await listJobs(authedRequest("http://localhost/api/jobs", orgId));
  if (!afterReplayJobs.ok) throw new Error("Failed to list jobs after replay.");
  const afterReplayPayload = (await afterReplayJobs.json()) as {
    data: Array<{ id: string; status: string }>;
  };
  const replayedJob = afterReplayPayload.data.find((job) => job.id === extractionJob.id);
  if (!replayedJob || replayedJob.status !== "succeeded") {
    throw new Error(`Expected replayed job to be succeeded. status=${replayedJob?.status ?? "missing"}`);
  }

  const afterReplayBoard = await getReadinessBoard(
    authedRequest("http://localhost/api/enterprise/readiness-board", orgId)
  );
  if (!afterReplayBoard.ok) throw new Error("Failed to fetch readiness board after replay.");
  const afterBoardPayload = (await afterReplayBoard.json()) as {
    data: { blockers: Array<{ code: string }> };
  };
  if (afterBoardPayload.data.blockers.some((item) => item.code === "queue_dead_letter_backlog")) {
    throw new Error("Expected queue_dead_letter_backlog to clear after replay and worker run.");
  }

  console.log("queue-replay-disaster-smoke:ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
