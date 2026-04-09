'use client';

import { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';

export interface DonutSlice {
  name: string;
  value: number;
  color?: string;
}

interface MiniDonutChartProps {
  data: DonutSlice[];
  size?: number;
}

export function MiniDonutChart({ data, size = 72 }: MiniDonutChartProps) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const root = am5.Root.new(ref.current);
    root._logo?.dispose();
    root.setThemes([am5themes_Animated.new(root)]);
    root.container.get('background')?.set('fillOpacity', 0);

    const chart = root.container.children.push(
      am5percent.PieChart.new(root, {
        innerRadius: am5.percent(62),
        paddingTop: 0,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 0,
      })
    );

    const series = chart.series.push(
      am5percent.PieSeries.new(root, {
        valueField: 'value',
        categoryField: 'name',
        alignLabels: false,
      })
    );

    series.labels.template.set('forceHidden', true);
    series.ticks.template.set('forceHidden', true);

    series.slices.template.setAll({
      tooltipText: '[bold]{category}[/]\n{value}',
      strokeWidth: 2,
      stroke: am5.color('#ffffff'),
      cornerRadiusTL: 2,
      cornerRadiusTR: 2,
      cornerRadiusBL: 2,
      cornerRadiusBR: 2,
    });

    // Usa a cor definida no slice, quando disponível
    series.slices.template.adapters.add('fill', (_fill, target) => {
      const ctx = target.dataItem?.dataContext as DonutSlice | undefined;
      if (ctx?.color) return am5.color(ctx.color);
      return _fill;
    });
    series.slices.template.adapters.add('stroke', () => am5.color('#ffffff'));

    series.data.setAll(data);
    series.appear(800);

    return () => root.dispose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  if (data.length === 0) return null;

  return <div ref={ref} style={{ width: size, height: size, flexShrink: 0 }} />;
}
