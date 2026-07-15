import { Card } from "@/components/ui/card";

export function ErrorState({ message }: { message: string }) { return <Card className="border-rose-500/40 bg-rose-500/10 p-10 text-center text-rose-300">{message}</Card>; }

