type FoodStatsProps = {
  foodBalance: number;
  foodEarnedToday: number;
};

export function FoodStatsBadge({ foodBalance, foodEarnedToday }: FoodStatsProps) {
  return (
    <div className="rounded-2xl bg-white/80 px-3 py-2 text-center shadow-sm">
      <div className="text-sm font-bold text-amber-800">
        🌾 总粮 {foodBalance} / 今日+{foodEarnedToday}
      </div>
    </div>
  );
}
