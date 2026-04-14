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

    /* ── Tooltip ─────────────────────────────────────────── */
    const tooltip = am5.Tooltip.new(root, {
      pointerOrientation: 'horizontal',
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (tooltip.get('background') as any)?.setAll({
      cornerRadiusTL: 8,
      cornerRadiusTR: 8,
      cornerRadiusBL: 8,
      cornerRadiusBR: 8,
    });
    tooltip.label.setAll({
      textAlign: 'center',
      fontSize: 12,
    });
    series.set('tooltip', tooltip);

    /* ── Fatias ──────────────────────────────────────────── */
    // Legenda em cima (bold) + valor embaixo; usa {valueFormatted} do dataContext
    // templateField aplica fill/stroke per-slice SEM adapters (cross-browser safe)
    series.slices.template.setAll({
      tooltipText: '[align=center][bold]{category}[/]\n{valueFormatted}[/]',
      strokeWidth: 0.5,
      stroke: am5.color(0xffffff),
      strokeOpacity: 0.7,
      cursorOverStyle: 'pointer',
      toggleKey: 'none',
      templateField: 'sliceSettings',
    });

    // Hover state: explosão
    series.slices.template.states.create('hover', {
      shiftRadius: 6,
      scale: 1.05,
    });

    /* ── Dados ───────────────────────────────────────────── */
    // Embute cores e valor formatado no data para evitar adapters
    const chartData = data.map((d) => ({
      ...d,
      valueFormatted: formatRef.current ? formatRef.current(d.value) : String(d.value),
      sliceSettings: {
        fill: d.color ? am5.color(d.color) : undefined,
        stroke: am5.color(0xffffff),
      },
    }));

    series.data.setAll(chartData);
    series.appear(800);
    chart.appear(800, 100);

    /* ── Overflow visível para tooltip escapar ────────────── */
    const container = ref.current;
    if (container) {
      container.style.overflow = 'visible';
      const applyOverflow = () => {
        container.querySelectorAll('canvas, svg').forEach((el) => {
          (el as HTMLElement).style.overflow = 'visible';
        });
      };
      applyOverflow();
      setTimeout(applyOverflow, 900);
    }

    return () => root.dispose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(data)]);

  if (data.length === 0) return null;

  return (
    <div
      ref={ref}
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        overflow: 'visible',
        position: 'relative',
        zIndex: 10,
      }}
    />
  );
}

