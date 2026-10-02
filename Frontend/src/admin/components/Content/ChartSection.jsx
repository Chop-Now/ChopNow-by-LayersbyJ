import React from 'react';
import RevenueChart from './RevenueChart';
import SalesChart from './SalesChart';
import OrderTrendsChart from './OrderTrendsChart';

const ChartSection = () => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RevenueChart />
        </div>
        <div className="space-y-6">
          <SalesChart />
        </div>
      </div>
      <div className="w-full">
        <OrderTrendsChart />
      </div>
    </div>
  );
};

export default ChartSection;
