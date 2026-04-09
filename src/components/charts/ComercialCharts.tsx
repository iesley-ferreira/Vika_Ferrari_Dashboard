'use client';

import { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { ComercialDayPoint } from '@/hooks/useMonthReports';

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

function makeYRenderer(root: am5.Root) {
  const yRenderer = am5xy.AxisRendererY.new(root, {});
  yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color('#7e7665') });
  yRenderer.grid.template.setAll({ stroke: am5.color('#d0c5b2'), strokeOpacity: 0.2 });
  return yRenderer;
}

// Creates root with legend on top + chart filling remaining height.
function buildRootWithLegend(el: HTMLDivElement) {
  const root = am5.Root.new(el);
  root._logo?.dispose();
  root.setThemes([am5themes_Animated.new(root)]);
  root.container.get('background')?.set('fillOpacity', 0);

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

// Simple root (no legend)
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

// ── Chart 1: Faturamento & Cash Collect (Line) ───────────────
function FaturamentoChart({ data }: { data: ComercialDayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const { root, chart, legend } = buildRootWithLegend(ref.current);
    const xAxis = makeXAxis(root, chart);

    const yRenderer = makeYRenderer(root);
    yRenderer.labels.template.adapters.add('text', (text, target) => {
      const v = Number((target.dataItem as any)?.get('value'));
      return isNaN(v) ? text : `${(v / 1000).toFixed(0)}k`;
    });
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0 })
    );

    const addLine = (field: string, name: string, color: string, dashed = false) => {
      const series = chart.series.push(
        am5xy.LineSeries.new(root, {
          xAxis, yAxis,
          valueYField: field,
          categoryXField: 'date',
          name,
          stroke: am5.color(color),
          fill: am5.color(color),
          tooltip: am5.Tooltip.new(root, {
            labelText: `${name}: R$ {valueY.formatNumber('#,###')}`,
          }),
        })
      );
      series.strokes.template.setAll({
        strokeWidth: 2,
        ...(dashed ? { strokeDasharray: [5, 3] } : {}),
      });
      series.bullets.push(() =>
        am5.Bullet.new(root, {
          sprite: am5.Circle.new(root, { radius: 4, fill: am5.color(color) }),
        })
      );
      series.data.setAll(data);
      series.appear(1000);
    };

    addLine('faturamento', 'Faturamento', '#67b7dc');
    addLine('cashCollect', 'Cash Collect', '#6794dc', true);

    legend.data.setAll(chart.series.values);
    xAxis.data.setAll(data);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height: 240 }} />;
}

// ── Chart 2: Vendas + Agendamentos + Calls (Grouped Bars) ────
function VendasChart({ data }: { data: ComercialDayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const { root, chart, legend } = buildRootWithLegend(ref.current);
    const xAxis = makeXAxis(root, chart);

    const yRenderer = makeYRenderer(root);
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0 })
    );

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

    addBar('vendas',          'Vendas',          '#67b7dc');
    addBar('agendamentos',    'Agendamentos',     '#a367dc');
    addBar('callsRealizadas', 'Calls Realizadas', '#c767dc');

    legend.data.setAll(chart.series.values);
    xAxis.data.setAll(data);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height: 240 }} />;
}

// ── Chart 3: Contatos Capturados (Single Bar) ────────────────
function CapturadosChart({ data }: { data: ComercialDayPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!ref.current || data.length === 0) return;

    const { root, chart } = buildSimpleRoot(ref.current);
    const xAxis = makeXAxis(root, chart);

    const yRenderer = makeYRenderer(root);
    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, { renderer: yRenderer, min: 0 })
    );

    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        xAxis, yAxis,
        valueYField: 'capturados',
        categoryXField: 'date',
        name: 'Capturados',
        fill: am5.color('#8067dc'),
        stroke: am5.color('#8067dc'),
        tooltip: am5.Tooltip.new(root, { labelText: 'Capturados: {valueY}' }),
      })
    );
    series.columns.template.setAll({
      cornerRadiusTL: 3, cornerRadiusTR: 3, strokeOpacity: 0,
    });
    series.data.setAll(data);
    series.appear(1000);

    xAxis.data.setAll(data);
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [data]);

  return <div ref={ref} style={{ width: '100%', height: 200 }} />;
}

// ── Exported composite ───────────────────────────────────────
interface Props {
  data: ComercialDayPoint[];
}

export function ComercialEvolutionCharts({ data }: Props) {
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
        <p className="text-sm font-semibold text-on-surface mb-2">Faturamento &amp; Cash Collect (R$)</p>
        <FaturamentoChart data={data} />
      </div>

      <div className="bg-background rounded-md border border-outline-variant p-4">
        <p className="text-sm font-semibold text-on-surface mb-2">Vendas, Agendamentos &amp; Calls</p>
        <VendasChart data={data} />
      </div>

      <div className="bg-background rounded-md border border-outline-variant p-4 lg:col-span-2">
        <p className="text-sm font-semibold text-on-surface mb-2">Contatos Capturados no Mês</p>
        <CapturadosChart data={data} />
      </div>
    </div>
  );
}
