import { fmt } from './constants';

export default function DayHeader({
  dayObj,
  dayCost,
}: {
  dayObj: { label: string; date: string };
  dayCost: number;
}) {
  return (
    <div className="h-14 border-b bg-gradient-to-r from-blue-500 to-blue-600 flex flex-col items-center justify-center">
      <span className="text-white font-semibold text-sm">{dayObj.label}</span>
      <span className="text-white/80 text-xs">{dayObj.date}</span>
      {dayCost > 0 && (
        <span className="text-white font-bold text-xs mt-0.5 bg-black/20 px-2 py-0.5 rounded-full">
          NT$ {fmt(dayCost)}
        </span>
      )}
    </div>
  );
}