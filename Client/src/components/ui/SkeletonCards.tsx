import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function StatCardSkeleton() {
    return (
        <Card className="border-2 border-white/50 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden bg-white/40 dark:bg-slate-800/40 backdrop-blur-md">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <Skeleton className="h-4 w-[100px]" />
                <Skeleton className="h-8 w-8 rounded-xl" />
            </CardHeader>
            <CardContent>
                <Skeleton className="h-8 w-[120px] mb-2" />
                <Skeleton className="h-3 w-[80px]" />
            </CardContent>
        </Card>
    );
}

export function ChartSkeleton() {
    return (
        <Card className="border-2 border-white/50 dark:border-slate-700/50 shadow-lg rounded-3xl overflow-hidden bg-white/40 dark:bg-slate-800/40 backdrop-blur-md">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-[150px]" />
                    <Skeleton className="h-8 w-[100px] rounded-xl" />
                </div>
            </CardHeader>
            <CardContent className="h-80 flex items-end gap-2 px-6 pb-6">
                {[...Array(12)].map((_, i) => (
                    <Skeleton
                        key={i}
                        className="flex-1 rounded-t-lg"
                        style={{ height: `${Math.random() * 60 + 20}%` }}
                    />
                ))}
            </CardContent>
        </Card>
    );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 border border-white dark:border-slate-800">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-xl" />
                        <div>
                            <Skeleton className="h-4 w-[100px] mb-2" />
                            <Skeleton className="h-3 w-[60px]" />
                        </div>
                    </div>
                    <Skeleton className="h-6 w-[80px] rounded-lg" />
                </div>
            ))}
        </div>
    );
}

export function GridCardSkeleton() {
    return (
        <div className="p-4 rounded-3xl bg-white/40 dark:bg-slate-900/40 border border-white dark:border-slate-800 shadow-xl">
            <Skeleton className="aspect-square w-full rounded-2xl mb-4" />
            <Skeleton className="h-5 w-[140px] mb-2" />
            <div className="flex justify-between items-center">
                <Skeleton className="h-6 w-[60px]" />
                <Skeleton className="h-8 w-[80px] rounded-xl" />
            </div>
        </div>
    );
}
