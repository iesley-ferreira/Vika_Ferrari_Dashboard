'use client';

import * as am5 from '@amcharts/amcharts5';
import * as am5percent from '@amcharts/amcharts5/percent';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import { useLayoutEffect, useRef } from 'react';

export interface DonutSlice {
  name: string;
  value: number;
  color?: string;
}

interface MiniDonutChartProps {
  data: DonutSlice[];
  size?: number;
  formatValue?: (value: number) => string;
}

export function MiniDonutChart({ data, size = 72, formatValue }: MiniDonutChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const formatRef = useRef(formatValue);
  formatRef.current = formatValue;

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
      })
    );

    series.labels.template.set('forceHidden', true);
    series.ticks.template.set('forceHidden', true);

    // Stroke fino para não comer fatias pequenas; sem cornerRadius (quebra hit-area em fatias minúsculas)
    series.slices.template.setAll({
      tooltipText: '[bold]{category}[/]: {valueFormatted}',
      strokeWidth: 1,
      stroke: am5.color('#ffffff'),
    });

    series.slices.template.states.create('hover', {
      shiftRadius: 6,
      scale: 1.05,
    });

    const tooltip = am5.Tooltip.new(root, {});
    tooltip.get('background')?.setAll({
      cornerRadiusTL: 6,
      cornerRadiusTR: 6,
      cornerRadiusBL: 6,
      cornerRadiusBR: 6,
    });
    tooltip.label.setAll({
      textAlign: 'center',
      fontSize: 12,
    });
    series.set('tooltip', tooltip);

    series.slices.template.adapters.add('fill', (fill, target) => {
      const ctx = target.dataItem?.dataContext as DonutSlice | undefined;
      if (ctx?.color) return am5.color(ctx.color);
      return fill;
    });
    series.slices.template.adapters.add('stroke', () => am5.color('#ffffff'));

    // Injeta valor formatado no dataItem para uso em tooltipText
    const formatted = data.map((d) => ({
      ...d,
      valueFormatted: formatRef.current ? formatRef.current(d.value) : String(d.value),
    }));

    series.data.setAll(formatted);
    series.appear(800);

    const container = ref.current;
    if (container) {
      container.style.overflow = 'visible';
      container.querySelectorAll('svg').forEach((svg) => {
        (svg as SVGElement).style.overflow = 'visible';
      });
    }

    return () => root.dispose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  if (data.length === 0) return null;

  return <div ref={ref} style={{ width: size, height: size, flexShrink: 0 }} />;
}
