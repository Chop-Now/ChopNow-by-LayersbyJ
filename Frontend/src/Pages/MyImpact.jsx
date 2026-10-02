import Footer from '../Components/Footer';
import PageNavbar from '../Components/PageNavbar';
import React, { useState, useEffect, useRef } from 'react';
import {
  Award,
  Leaf,
  Droplets,
  Wind,
  Loader2,
  Scale,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { analyticsService } from '../services';

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
  }, []);

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
      <div className="min-h-screen flex items-center justify-center bg-white">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white min-h-screen pt-20">
        <PageNavbar />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Header */}
          <div className="mb-6 text-center">
            <h2 className="text-xl font-bold text-gray-900 mb-1">Your Impact Summary</h2>
            <p className="text-sm text-gray-600">
              Thank you for making a difference! Here's a summary of your positive environmental
              impact.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-8">
            {/* Meals Rescued Card */}
            <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center">
              <div className="flex items-center justify-center mb-1">
                <Leaf className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--color-solid)' }} />
              </div>
              <h3 className="text-gray-600 text-[10px] md:text-xs font-medium mb-1">
                Meals Rescued
              </h3>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {impactData.mealsRescued.toLocaleString()}
              </p>
              {impactData.comparison && (
                <div
                  className={`flex items-center justify-center gap-1 text-xs mt-1 ${impactData.comparison.percentageChange.trend === 'up' ? 'text-green-600' : 'text-red-500'}`}
                >
                  {impactData.comparison.percentageChange.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span>
                    {impactData.comparison.percentageChange.meals >= 0 ? '+' : ''}
                    {impactData.comparison.percentageChange.meals}% vs last month
                  </span>
                </div>
              )}
            </div>

            {/* CO2e Saved Card */}
            <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center">
              <div className="flex items-center justify-center mb-1">
                <Wind className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--color-solid)' }} />
              </div>
              <h3 className="text-gray-600 text-[10px] md:text-xs font-medium mb-1">CO2e Saved</h3>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {impactData.co2Saved.toLocaleString()}
                <span className="text-sm md:text-base">kg</span>
              </p>
            </div>

            {/* Water Saved Card */}
            <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center">
              <div className="flex items-center justify-center mb-1">
                <Droplets
                  className="w-5 h-5 md:w-6 md:h-6"
                  style={{ color: 'var(--color-solid)' }}
                />
              </div>
              <h3 className="text-gray-600 text-[10px] md:text-xs font-medium mb-1">Water Saved</h3>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {impactData.waterSaved.toLocaleString()}
                <span className="text-sm md:text-base">L</span>
              </p>
            </div>

            {/* Food Waste Saved Card */}
            <div className="bg-white rounded-lg shadow-md p-3 md:p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer text-center">
              <div className="flex items-center justify-center mb-1">
                <Scale className="w-5 h-5 md:w-6 md:h-6" style={{ color: 'var(--color-solid)' }} />
              </div>
              <h3 className="text-gray-600 text-[10px] md:text-xs font-medium mb-1">
                Food Waste Saved
              </h3>
              <p className="text-lg md:text-2xl font-bold text-gray-900">
                {impactData.foodWasteSaved.toLocaleString()}
                <span className="text-sm md:text-base">kg</span>
              </p>
            </div>
          </div>

          {/* Milestones Section */}
          <div className="mb-8">
            <h2 className="text-lg font-bold text-gray-900 mb-1 text-center">
              Your Contribution Milestones
            </h2>
            <p className="text-sm text-gray-600 mb-4 text-center">
              See how you're progressing towards the next level of impact.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {/* Meals Milestone Card */}
              <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Food Waste Warrior</h3>
                    <p className="text-gray-600 text-xs">
                      Rescue {mealsRemaining} more meals to reach your next milestone!
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs font-medium whitespace-nowrap"
                    style={{ color: 'var(--color-solid)' }}
                  >
                    <Award className="w-4 h-4" />
                    <span>Next: {mealsMilestone} meals</span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">
                      {impactData.mealsRescued} / {mealsMilestone} meals
                    </span>
                    <span className="font-bold" style={{ color: 'var(--color-solid)' }}>
                      {Math.round(mealsProgress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${mealsProgress}%`,
                        background: 'linear-gradient(to right, #0F3D2E, #0A2A20)',
                      }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* CO2 Milestone Card */}
              <div className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">Carbon Crusader</h3>
                    <p className="text-gray-600 text-xs">
                      Save {co2Remaining.toFixed(1)} more kg of CO2e to reach your next milestone!
                    </p>
                  </div>
                  <div
                    className="flex items-center gap-1 text-xs font-medium whitespace-nowrap"
                    style={{ color: 'var(--color-solidOne)' }}
                  >
                    <Award className="w-4 h-4" />
                    <span>Next: {co2Milestone}kg</span>
                  </div>
                </div>

                <div className="mb-2">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">
                      {impactData.co2Saved.toFixed(1)} / {co2Milestone} kg
                    </span>
                    <span className="font-bold" style={{ color: 'var(--color-solidOne)' }}>
                      {Math.round(co2Progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${co2Progress}%`,
                        background: 'linear-gradient(to right, #FFC531, #E8552F)',
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Impact Over Time Chart */}
          <div className="mb-8">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-900 mb-1">Your Impact Over Time</h2>
              <p className="text-sm text-gray-600">
                This chart visualizes your growing contribution to a healthier planet each month.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-5 hover:shadow-lg transition-shadow duration-300">
              <div className="flex gap-4 mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: 'var(--color-solid)' }}
                  ></div>
                  <span className="text-xs text-gray-600">Meals Rescued</span>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: 'var(--color-solidOne)' }}
                  ></div>
                  <span className="text-xs text-gray-600">CO2e Saved (kg)</span>
                </div>
              </div>

              {/* Chart */}
              <div className="relative h-64">
                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-xs text-gray-500 w-8">
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
                      <div key={i} className="w-full border-t border-gray-200"></div>
                    ))}
                  </div>

                  {/* SVG for lines */}
                  <svg className="absolute inset-0 w-full h-full">
                    {/* Meals line (green) */}
                    <polyline
                      fill="none"
                      stroke="#0F3D2E"
                      strokeWidth="2"
                      points={chartData
                        .map((d, i) => {
                          const x = (i / (chartData.length - 1)) * width;
                          const y = height - (d.meals / maxMeals) * height;
                          return `${x},${y}`;
                        })
                        .join(' ')}
                    />
                    {/* CO2 line (orange) */}
                    <polyline
                      fill="none"
                      stroke="#E8552F"
                      strokeWidth="2"
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
                      return <circle key={`meal-${i}`} cx={x} cy={y} r="3" fill="#0F3D2E" />;
                    })}
                    {/* Data points for CO2 */}
                    {chartData.map((d, i) => {
                      const x = (i / (chartData.length - 1)) * width;
                      const y = height - (d.co2 / maxCo2) * height;
                      return <circle key={`co2-${i}`} cx={x} cy={y} r="3" fill="#E8552F" />;
                    })}
                  </svg>
                </div>

                {/* X-axis labels */}
                <div className="absolute left-10 right-0 bottom-0 flex justify-between text-xs text-gray-500">
                  {chartData.map((d) => (
                    <span key={d.month}>{d.month}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default MyImpact;
