"use client";

import { Card } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EvaluationTrendChart({ scores }: { scores: number[] }) {
  if (!scores.length) return null;
  const data = scores.map((score, index) => ({ index: index + 1, score }));
  return (
    <Card className="p-5">
      <p className="section-label">Evaluation Trend</p>
      <div className="mt-3 h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <XAxis dataKey="index" stroke="#7b86b6" />
            <YAxis domain={[0, 100]} stroke="#7b86b6" />
            <Tooltip />
            <Line type="monotone" dataKey="score" stroke="#6f4cff" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

