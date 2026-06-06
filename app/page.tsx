import RouteScanner from "@/app/components/RouteScanner";
import StreetViewTester from "@/app/components/StreetViewTester";

export default function Home() {
  return (
    <div className="min-h-screen bg-zinc-50">
      <RouteScanner />
      <div className="border-t border-zinc-200 bg-white">
        <StreetViewTester />
      </div>
    </div>
  );
}
