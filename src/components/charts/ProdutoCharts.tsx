'use client';

import { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { ProdutoDayPoint } from '@/hooks/useMonthReports';

// ── Shared helpers ────────────────────────────────────────────

function makeXAxis(root: am5.Root, chart: am5xy.XYChart) {
  const xRenderer = am5xy.AxisRendererX.new(root, { minGridDistance: 30 });
  xRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color('#7e7665') });
  xRenderer.grid.template.setAll({ stroke: am5.color('#d0c5b2'), strokeOpacity: 0.2 });
  const xAxis = chart.xAxes.push(
    am5xy.CategoryAxis.new(root, { categoryField: 'date', renderer: xRenderer })
  );
  chart.set('cursor', am5xy.XYCursor.new(root, { behavior: 'none', xAxis }));
  return xAxis;
}

function makeYAxis(root: am5.Root, chart: am5xy.XYChart, unit = '', opposite = false) {
  const renderer = am5xy.AxisRendererY.new(root, { opposite });
  renderer.labels.template.setAll({
    fontSize: 10,
    fill: am5.color('#7e7665'),
    ...(unit ? { text: `{value}${unit}` } : {}),
  });
  renderer.grid.template.setAll({ stroke: am5.color('#d0c5b2'), strokeOpacity: 0.2 });
  return chart.yAxes.push(am5xy.ValueAxis.new(root, { renderer, min: 0 }));
}

// Creates root with legend on top + chart filling remaining height.
// Returns { chart, legend } ready to use.
function buildRootWithLegend(el: HTMLDivElement) {
  const root = am5.Root.new(el);
  root._logo?.dispose();
  root.setThemes([am5themes_Animated.new(root)]);
  root.container.get('background')?.set('fillOpacity', 0);

  // Stack legend and chart vertically inside the root container
  root.container.setAll({ layout: root.verticalLayout });

  const legend = root.container.children.push(
    am5.Legend.new(root, {
      centerX: am5.percent(50),
      x: am5.percent(50),
      marginBottom: 6,
    })
  );
  legend.labels.template.setAll({ fontSize: 11, fill: am5.color('#4d4637') });

  const chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      panX: false, panY: false,
      wheelX: 'none', wheelY: 'none',
      paddingLeft: 0, paddingRight: 8,
      paddingTop: 4, paddingBottom: 4,
      height: am5.percent(100),
    })
  );

  return { root, chart, legend };
}

// Simple root (no legend) for charts that don't need one
function buildSimpleRoot(el: HTMLDivElement) {
  const root = am5.Root.new(el);
  root._logo?.dispose();
  root.setThemes([am5themes_Animated.new(root)]);
  root.container.get('background')?.set('fillOpacity', 0);

  const chart = root.container.children.push(
    am5xy.XYChart.new(root, {
      panX: false, panY: false,
      wheelX: 'none', wheelY: 'none',
      paddingLeft: 0, paddingRight: 8,
      paddingTop: 4, paddingBottom: 4,
    })
  );

  return { root, chart };
}

// ── Chart 1: Atendimentos vs Resolvidos (Grouped Bars) ───────
function AtendimentosChart({ data }: { data: ProdutoDayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const { root, chart, legend } = buildRootWithLegend(ref.current);
    const xAxis = makeXAxis(root, chart);
    const yAxis = makeYAxis(root, chart);

    const addBar = (field: string, name: string, color: string) => {
      const series = chart.series.push(
        am5xy.ColumnSeries.new(root, {
          xAxis, yAxis,
          valueYField: field,
          categoryXField: 'date',
          name,
          fill: am5.color(color),
          stroke: am5.color(color),
          clustered: true,
          tooltip: am5.Tooltip.new(root, { labelText: `${name}: {valueY}` }),
        })
      );
      series.columns.template.setAll({
        cornerRadiusTL: 3, cornerRadiusTR: 3,
        strokeOpacity: 0,
        width: am5.percent(70),
      });
      series.data.setAll(data);
      series.appear(1000);
    };

    addBar('atendimentos', 'Atendimentos', '#67b7dc');
    addBar('resolvidos',   'Resolvidos',   '#8067dc');

    legend.data.setAll(chart.series.values);
    xAxis.data.setAll(data);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height: 240 }} />;
}

// ── Chart 2: TMR Médio (Line + Reference line at 2h) ─────────
function TmrChart({ data }: { data: ProdutoDayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const { root, chart } = buildSimpleRoot(ref.current);
    const xAxis = makeXAxis(root, chart);
    const yAxis = makeYAxis(root, chart);

    const rangeDataItem = yAxis.makeDataItem({ value: 2 });
    yAxis.createAxisRange(rangeDataItem);
    rangeDataItem.get('grid')?.setAll({
      stroke: am5.color('#c9a84c'),
      strokeDasharray: [5, 3],
      strokeOpacity: 0.8,
      visible: true,
    });
    rangeDataItem.get('label')?.setAll({
      text: 'Meta 2h',
      fill: am5.color('#c9a84c'),
      fontSize: 10,
      inside: true,
      centerY: am5.percent(100),
    });

    const series = chart.series.push(
      am5xy.LineSeries.new(root, {
        xAxis, yAxis,
        valueYField: 'tmr',
        categoryXField: 'date',
        name: 'TMR Médio (h)',
        stroke: am5.color('#6771dc'),
        fill: am5.color('#6771dc'),
        tooltip: am5.Tooltip.new(root, { labelText: 'TMR: {valueY}h' }),
      })
    );
    series.strokes.template.set('strokeWidth', 2);
    series.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, { radius: 4, fill: am5.color('#6771dc') }),
      })
    );
    series.data.setAll(data);
    series.appear(1000);

    xAxis.data.setAll(data);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height: 220 }} />;
}

// ── Chart 3: Taxa de Resolução (Line) + Bloqueios (Bar) ──────
function TaxaChart({ data }: { data: ProdutoDayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const { root, chart, legend } = buildRootWithLegend(ref.current);
    const xAxis = makeXAxis(root, chart);
    const yLeft  = makeYAxis(root, chart);
    const yRight = makeYAxis(root, chart, '', true);

    const barSeries = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis, yAxis: yRight,
        valueYField: 'bloqueios',
        categoryXField: 'date',
        name: 'Bloqueios',
        fill: am5.color('#a367dc'),
        stroke: am5.color('#a367dc'),
        tooltip: am5.Tooltip.new(root, { labelText: 'Bloqueios: {valueY}' }),
      })
    );
    barSeries.columns.template.setAll({
      cornerRadiusTL: 3, cornerRadiusTR: 3, strokeOpacity: 0,
    });
    barSeries.data.setAll(data);
    barSeries.appear(1000);

    const lineSeries = chart.series.push(
      am5xy.LineSeries.new(root, {
        xAxis, yAxis: yLeft,
        valueYField: 'taxaResolucao',
        categoryXField: 'date',
        name: 'Taxa Resolução (%)',
        stroke: am5.color('#67b7dc'),
        fill: am5.color('#67b7dc'),
        tooltip: am5.Tooltip.new(root, { labelText: 'Taxa: {valueY}%' }),
      })
    );
    lineSeries.strokes.template.set('strokeWidth', 2);
    lineSeries.bullets.push(() =>
      am5.Bullet.new(root, {
        sprite: am5.Circle.new(root, { radius: 4, fill: am5.color('#67b7dc') }),
      })
    );
    lineSeries.data.setAll(data);
    lineSeries.appear(1000);

    legend.data.setAll(chart.series.values);
    xAxis.data.setAll(data);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height: 240 }} />;
}

// ── Exported composite ───────────────────────────────────────
interface Props {
  data: ProdutoDayPoint[];
}

export function ProdutoEvolutionCharts({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-center py-10 text-on-surface-variant text-sm">
        Nenhum dado disponível ainda para o mês.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-background rounded-md border border-outline-variant p-4">
        <p className="text-sm font-semibold text-on-surface mb-2">Atendimentos vs Resolvidos</p>
        <AtendimentosChart data={data} />
      </div>

      <div className="bg-background rounded-md border border-outline-variant p-4">
        <p className="text-sm font-semibold text-on-surface mb-2">TMR Médio ao Longo do Mês (horas)</p>
        <TmrChart data={data} />
      </div>

      <div className="bg-background rounded-md border border-outline-variant p-4 lg:col-span-2">
        <p className="text-sm font-semibold text-on-surface mb-2">Taxa de Resolução (%) e Bloqueios</p>
        <TaxaChart data={data} />
      </div>
    </div>
  );
}
