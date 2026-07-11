import type { CountryAnalysisResult } from "@jobs-reporter/shared";
import { dayLabel, formatHourLabel } from "@jobs-reporter/shared";
import { CountryFlag } from "./CountryFlag";
import { DistributionBar, RankedList } from "./DistributionBar";

export function CountryAnalysisCard({ country }: { country: CountryAnalysisResult }) {
  const maxHourly = Math.max(...country.hourlyDistribution.map((item) => item.count), 1);
  const maxDaily = Math.max(...country.dailyDistribution.map((item) => item.count), 1);
  const activeHours = country.hourlyDistribution.filter((item) => item.count > 0);

  return (
    <section className="rounded-xl border border-zinc-200 p-4 sm:p-5">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-100 pb-4">
        <div className="flex items-center gap-2">
          <CountryFlag
            code={country.code}
            location={country.location}
            flag={country.flag}
            size="md"
          />
          <div>
            <h3 className="font-semibold text-zinc-900">{country.location}</h3>
            <p className="text-xs text-zinc-500">{country.totalJobs} уникални позиции</p>
          </div>
        </div>
        <div className="text-right text-xs text-zinc-500">
          <div>
            Пик: <span className="font-medium text-zinc-700">{formatHourLabel(country.peakHour)}</span>
          </div>
          <div>
            Най-активен ден:{" "}
            <span className="font-medium text-zinc-700">{country.peakDay}</span>
          </div>
        </div>
      </header>

      <div className="mt-4 grid gap-6 lg:grid-cols-2">
        <div>
          <h4 className="mb-2 text-sm font-medium text-zinc-800">Най-търсени позиции</h4>
          <RankedList items={country.topPositions.slice(0, 10)} />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-zinc-800">Технологии</h4>
          <RankedList items={country.topTechnologies.slice(0, 12)} />
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-zinc-800">По час (Sofia)</h4>
          {activeHours.length === 0 ? (
            <p className="text-sm text-zinc-400">Няма данни за час на публикуване</p>
          ) : (
            <div className="space-y-1">
              {activeHours.map((item) => (
                <DistributionBar
                  key={item.hour}
                  label={formatHourLabel(item.hour)}
                  count={item.count}
                  max={maxHourly}
                />
              ))}
            </div>
          )}
        </div>

        <div>
          <h4 className="mb-2 text-sm font-medium text-zinc-800">По ден от седмицата</h4>
          <div className="space-y-1">
            {country.dailyDistribution.map((item) => (
              <DistributionBar
                key={item.day}
                label={dayLabel(item.day).slice(0, 3)}
                count={item.count}
                max={maxDaily}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
