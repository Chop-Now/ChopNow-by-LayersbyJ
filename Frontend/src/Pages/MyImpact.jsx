import Footer from '../Components/Footer';
import PageNavbar from '../Components/PageNavbar';
import React, { useState, useEffect, useRef } from 'react';
import { Award, Leaf, Droplets, Wind, Scale, TrendingUp, TrendingDown } from 'lucide-react';
import { analyticsService } from '../services';
import { PageHero, BrandLoader } from '../Components/brand/Kit';

const MyImpact = () => {
  const [loading, setLoading] = useState(true);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
    // Re-attach once loading ends: the chart is not mounted on the first render.
  }, [loading]);

  const [impactData, setImpactData] = useState({
    mealsRescued: 0,
    co2Saved: 0,
    waterSaved: 0,
    foodWasteSaved: 0,
    ordersCount: 0,
    monthlyData: [],
    comparison: null,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchImpact = async () => {
      try {
        const data = await analyticsService.getMyImpact();
        if (!isMounted) return;
        setImpactData({
          mealsRescued: data.mealsRescued || 0,
          co2Saved: data.co2Saved || 0,
          waterSaved: data.waterSaved || 0,
          foodWasteSaved: data.foodWasteSaved || 0,
          ordersCount: data.ordersCount || 0,
          monthlyData: data.monthlyData || [],
          comparison: data.comparison || null,
        });
      } catch (error) {
        if (!isMounted) return;
        console.error('Error fetching impact data:', error);
        setImpactData({
          mealsRescued: 0,
          co2Saved: 0,
          waterSaved: 0,
          foodWasteSaved: 0,
          ordersCount: 0,
          monthlyData: [],
          comparison: null,
        });
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchImpact();
    return () => {
      isMounted = false;
    };
  }, []);

  // Chart data - use API data if available, otherwise generate from monthly data or default
  const chartData =
    impactData.monthlyData.length > 0
      ? impactData.monthlyData
      : [
          { month: 'Jan', meals: 0, co2: 0 },
          { month: 'Feb', meals: 0, co2: 0 },
          { month: 'Mar', meals: 0, co2: 0 },
          { month: 'Apr', meals: 0, co2: 0 },
          { month: 'May', meals: 0, co2: 0 },
          { month: 'Jun', meals: 0, co2: 0 },
          { month: 'Jul', meals: 0, co2: 0 },
          { month: 'Aug', meals: 0, co2: 0 },
          { month: 'Sep', meals: 0, co2: 0 },
          { month: 'Oct', meals: 0, co2: 0 },
          { month: 'Nov', meals: 0, co2: 0 },
          { month: 'Dec', meals: 0, co2: 0 },
        ];

  const maxMeals = Math.max(...chartData.map((d) => d.meals), 1);
  const maxCo2 = Math.max(...chartData.map((d) => d.co2), 1);

  const width = dimensions.width || 500;
  const height = dimensions.height || 224;

  // Calculate milestones
  const mealsMilestone = Math.ceil(impactData.mealsRescued / 50) * 50 + 50; // Next 50 milestone
  const mealsProgress = Math.min((impactData.mealsRescued / mealsMilestone) * 100, 100);
  const mealsRemaining = mealsMilestone - impactData.mealsRescued;

  const co2Milestone = Math.ceil(impactData.co2Saved / 100) * 100 + 100; // Next 100kg milestone
  const co2Progress = Math.min((impactData.co2Saved / co2Milestone) * 100, 100);
  const co2Remaining = co2Milestone - impactData.co2Saved;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-fufu">
        <BrandLoader className="w-10 text-moringa" />
        <p className="eyebrow text-moringa-muted">Loading your impact</p>
      </div>
    );
  }

  const trendUp = impactData.comparison?.percentageChange.trend === 'up';

  const stats = [
    {
      key: 'meals',
      label: 'Meals rescued',
      value: impactData.mealsRescued.toLocaleString(),
      unit: '',
      Icon: Leaf,
      tone: 'bg-moringa text-fufu',
      eyebrow: 'text-yellow',
    },
    {
      key: 'co2',
      label: 'CO2e saved',
      value: impactData.co2Saved.toLocaleString(),
      unit: 'kg',
      Icon: Wind,
      tone: 'bg-lime text-moringa',
      eyebrow: '',
    },
    {
      key: 'water',
      label: 'Water saved',
      value: impactData.waterSaved.toLocaleString(),
      unit: 'L',
      Icon: Droplets,
      tone: 'bg-mint text-moringa',
      eyebrow: '',
    },
    {
      key: 'waste',
      label: 'Food waste saved',
      value: impactData.foodWasteSaved.toLocaleString(),
      unit: 'kg',
      Icon: Scale,
      tone: 'bg-yellow text-moringa',
      eyebrow: '',
    },
  ];

  return (
    <div>
      <div className="bg-fufu min-h-screen pt-[72px]">
        <PageNavbar />
        <PageHero
          eyebrow="Your account / Impact"
          title="My impact"
          art="leaf"
          intro="Thank you for making a difference. Here is what your rescues have kept out of the bin."
        />

        <div className="mx-auto max-w-[1440px] px-4 sm:px-8 lg:px-12 py-8 pb-20">
          {/* Stats Tiles */}
          <div className="grid grid-cols-2 lg:grid-cols-4">
            {stats.map(({ key, label, value, unit, Icon, tone, eyebrow }) => (
              <div
                key={key}
                className={`${tone} p-4 sm:p-6 min-h-[168px] sm:min-h-[200px] flex flex-col`}
              >
                <p className={`eyebrow text-[11px] flex items-center gap-2 ${eyebrow}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                  {label}
                </p>
                <p className="display text-[44px] sm:text-[64px] mt-auto pt-4 tabular-nums">
                  {value}
                  {unit && <span className="text-[0.45em] ml-1">{unit}</span>}
                </p>
                {key === 'meals' && impactData.comparison && (
                  <p
                    className={`mt-2 inline-flex items-center gap-1 self-start text-xs font-bold px-2 py-1 ${
                      trendUp ? 'bg-lime text-moringa' : 'bg-peach text-clay'
                    }`}
                  >
                    {trendUp ? (
                      <TrendingUp className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <TrendingDown className="w-3 h-3" aria-hidden="true" />
                    )}
                    {impactData.comparison.percentageChange.meals >= 0 ? '+' : ''}
                    {impactData.comparison.percentageChange.meals}% vs last month
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Milestones Section */}
          <section className="mt-12">
            <p className="eyebrow text-moringa-muted">Milestones</p>
            <h2 className="display text-[40px] md:text-[56px] text-moringa mt-2">
              Your next level
            </h2>
            <p className="mt-2 max-w-xl text-moringa-muted">
              See how you are progressing towards the next level of impact.
            </p>

            <div className="mt-6 grid md:grid-cols-2 border border-char/10 bg-white">
              {[
                {
                  title: 'Food waste warrior',
                  copy: `Rescue ${mealsRemaining} more meals to reach your next milestone.`,
                  next: `Next: ${mealsMilestone} meals`,
                  count: `${impactData.mealsRescued} / ${mealsMilestone} meals`,
                  progress: mealsProgress,
                  bar: 'bg-moringa',
                },
                {
                  title: 'Carbon crusader',
                  copy: `Save ${co2Remaining.toFixed(1)} more kg of CO2e to reach your next milestone.`,
                  next: `Next: ${co2Milestone}kg`,
                  count: `${impactData.co2Saved.toFixed(1)} / ${co2Milestone} kg`,
                  progress: co2Progress,
                  bar: 'bg-pepper',
                },
              ].map((m) => (
                <div
                  key={m.title}
                  className="p-5 sm:p-6 border-b md:border-b-0 md:border-r border-hairline last:border-0"
                >
                  <div className="flex items-start justify-between gap-4 mb-5">
                    <div>
                      <h3 className="font-bold text-lg text-moringa">{m.title}</h3>
                      <p className="text-sm text-moringa-muted mt-1">{m.copy}</p>
                    </div>
                    <span className="eyebrow text-[10px] flex items-center gap-1 bg-yellow text-moringa px-2 py-1 whitespace-nowrap">
                      <Award className="w-3.5 h-3.5" aria-hidden="true" />
                      {m.next}
                    </span>
                  </div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-sm font-semibold text-moringa tabular-nums">
                      {m.count}
                    </span>
                    <span className="display text-[28px] text-moringa tabular-nums">
                      {Math.round(m.progress)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-fufu-dim">
                    <div
                      className={`h-3 ${m.bar} transition-all duration-500`}
                      style={{ width: `${m.progress}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Impact Over Time Chart */}
          <section className="mt-12">
            <p className="eyebrow text-moringa-muted">Over time</p>
            <h2 className="display text-[40px] md:text-[56px] text-moringa mt-2">Month by month</h2>
            <p className="mt-2 max-w-xl text-moringa-muted">
              Your growing contribution to a healthier planet, each month.
            </p>

            <div className="mt-6 bg-white border border-char/10 p-5 sm:p-6">
              <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-moringa"></span>
                  <span className="eyebrow text-[11px] text-moringa">Meals rescued</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-pepper"></span>
                  <span className="eyebrow text-[11px] text-moringa">CO2e saved (kg)</span>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-64">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between font-mono text-[11px] text-moringa-muted w-8 tabular-nums">
                  <span>{Math.max(maxMeals, maxCo2)}</span>
                  <span>{Math.floor(Math.max(maxMeals, maxCo2) * 0.75)}</span>
                  <span>{Math.floor(Math.max(maxMeals, maxCo2) * 0.5)}</span>
                  <span>{Math.floor(Math.max(maxMeals, maxCo2) * 0.25)}</span>
                  <span>0</span>
                </div>

                {/* Chart area */}
                <div ref={containerRef} className="absolute left-10 right-0 top-0 bottom-8">
                  {/* Grid lines */}
                  <div className="absolute inset-0 flex flex-col justify-between">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-full border-t border-hairline"></div>
                    ))}
                  </div>

                  {/* SVG for lines */}
                  <svg className="absolute inset-0 w-full h-full overflow-visible">
                    {/* Meals line */}
                    <polyline
                      fill="none"
                      stroke="#0F3D2E"
                      strokeWidth="2.5"
                      points={chartData
                        .map((d, i) => {
                          const x = (i / (chartData.length - 1)) * width;
                          const y = height - (d.meals / maxMeals) * height;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {/* CO2 line */}
                    <polyline
                      fill="none"
                      stroke="#E8552F"
                      strokeWidth="2.5"
                      points={chartData
                        .map((d, i) => {
                          const x = (i / (chartData.length - 1)) * width;
                          const y = height - (d.co2 / maxCo2) * height;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {/* Data points for meals */}
                    {chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * width;
                      const y = height - (d.meals / maxMeals) * height;
                      return (
                        <rect
                          key={`meal-${i}`}
                          x={x - 3.5}
                          y={y - 3.5}
                          width="7"
                          height="7"
                          fill="#0F3D2E"
                        />
                      );
                    })}
                    {/* Data points for CO2 */}
                    {chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * width;
                      const y = height - (d.co2 / maxCo2) * height;
                      return (
                        <rect
                          key={`co2-${i}`}
                          x={x - 3.5}
                          y={y - 3.5}
                          width="7"
                          height="7"
                          fill="#E8552F"
                        />
                      );
                    })}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="absolute left-10 right-0 bottom-0 flex justify-between font-mono text-[10px] sm:text-[11px] uppercase text-moringa-muted">
                  {chartData.map((d) => (
                    <span key={d.month}>{d.month}</span>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyImpact;
