'use client';

import { useLayoutEffect, useRef } from 'react';
import * as am5 from '@amcharts/amcharts5';
import * as am5xy from '@amcharts/amcharts5/xy';
import am5themes_Animated from '@amcharts/amcharts5/themes/Animated';
import type { RankingEntry } from '@/components/dashboard/RankingList';

interface Props {
  entries: RankingEntry[];
}

function getAvatarSrc(entry: RankingEntry): string {
  if (entry.profile?.avatar_url) return entry.profile.avatar_url;
  const name = encodeURIComponent(entry.profile?.full_name ?? '?');
  return `https://ui-avatars.com/api/?name=${name}&background=8067dc&color=fff&size=64&bold=true&rounded=true`;
}

export function SalesRankingChart({ entries }: Props) {
  const chartRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!chartRef.current || entries.length === 0) return;

    const root = am5.Root.new(chartRef.current);
    root.setThemes([am5themes_Animated.new(root)]);
    root._logo?.dispose();
    root.container.get('background')?.set('fillOpacity', 0);

    const chart = root.container.children.push(
      am5xy.XYChart.new(root, {
        panX: false,
        panY: false,
        wheelX: 'none',
        wheelY: 'none',
        paddingBottom: 50,
        paddingTop: 40,
        paddingLeft: 0,
        paddingRight: 0,
      })
    );

    // X Axis — names
    const xRenderer = am5xy.AxisRendererX.new(root, {
      minorGridEnabled: true,
      minGridDistance: 60,
    });
    xRenderer.grid.template.set('visible', false);
    xRenderer.labels.template.setAll({
      fontSize: 12,
      fill: am5.color('#1d1c17'),
      fontWeight: '500',
      paddingTop: 6,
      maxWidth: 80,
      oversizedBehavior: 'truncate',
    });

    const xAxis = chart.xAxes.push(
      am5xy.CategoryAxis.new(root, {
        paddingTop: 40,
        categoryField: 'name',
        renderer: xRenderer,
      })
    );

    // Y Axis — scores
    const yRenderer = am5xy.AxisRendererY.new(root, {});
    yRenderer.grid.template.set('strokeDasharray', [3]);
    yRenderer.labels.template.setAll({ fontSize: 10, fill: am5.color('#7e7665') });

    const yAxis = chart.yAxes.push(
      am5xy.ValueAxis.new(root, {
        min: 0,
        renderer: yRenderer,
      })
    );

    // Column series
    const series = chart.series.push(
      am5xy.ColumnSeries.new(root, {
        name: 'Pontuação',
        xAxis,
        yAxis,
        valueYField: 'score',
        categoryXField: 'name',
        sequencedInterpolation: true,
        calculateAggregates: true,
        maskBullets: false,
        tooltip: am5.Tooltip.new(root, {
          dy: -30,
          pointerOrientation: 'vertical',
          labelText: '{fullName}\n[bold]{scoreLabel}[/] pts',
        }),
      })
    );

    series.columns.template.setAll({
      strokeOpacity: 0,
      cornerRadiusBR: 10,
      cornerRadiusTR: 10,
      cornerRadiusBL: 10,
      cornerRadiusTL: 10,
      maxWidth: 50,
      fillOpacity: 0.85,
    });

    // ── Hover animation ──────────────────────────────────────
    let currentlyHovered: any;

    function handleHover(dataItem: any) {
      if (dataItem && currentlyHovered !== dataItem) {
        handleOut();
        currentlyHovered = dataItem;
        dataItem.bullets?.[0]?.animate({
          key: 'locationY',
          to: 1,
          duration: 600,
          easing: am5.ease.out(am5.ease.cubic),
        });
      }
    }

    function handleOut() {
      if (currentlyHovered) {
        currentlyHovered.bullets?.[0]?.animate({
          key: 'locationY',
          to: 0,
          duration: 600,
          easing: am5.ease.out(am5.ease.cubic),
        });
        currentlyHovered = undefined;
      }
    }

    series.columns.template.events.on('pointerover', (e) =>
      handleHover((e.target as any).dataItem)
    );
    series.columns.template.events.on('pointerout', () => handleOut());

    // ── Photo bullet ─────────────────────────────────────────
    const circleTemplate = am5.Template.new<am5.Circle>({});

    series.bullets.push((root) => {
      const bulletContainer = am5.Container.new(root, {});

      // Outer colored ring (heat rule fills this)
      bulletContainer.children.push(
        am5.Circle.new(root, { radius: 28 }, circleTemplate)
      );

      // Mask circle for photo
      const maskCircle = bulletContainer.children.push(
        am5.Circle.new(root, { radius: 22 })
      );

      // Photo inside mask
      const imageContainer = bulletContainer.children.push(
        am5.Container.new(root, { mask: maskCircle })
      );

      imageContainer.children.push(
        am5.Picture.new(root, {
          templateField: 'pictureSettings',
          centerX: am5.p50,
          centerY: am5.p50,
          width: 48,
          height: 48,
        })
      );

      return am5.Bullet.new(root, {
        locationY: 0,
        sprite: bulletContainer,
      });
    });

    // ── Heat rules — menor pontuação → maior pontuação ───────
    series.set('heatRules', [
      {
        dataField: 'valueY',
        min: am5.color(0x67b7dc),
        max: am5.color(0xc767dc),
        target: series.columns.template,
        key: 'fill',
      },
      {
        dataField: 'valueY',
        min: am5.color(0x67b7dc),
        max: am5.color(0xc767dc),
        target: circleTemplate,
        key: 'fill',
      },
    ]);

    // ── Cursor ───────────────────────────────────────────────
    const cursor = chart.set('cursor', am5xy.XYCursor.new(root, {}));
    cursor.lineX.set('visible', false);
    cursor.lineY.set('visible', false);
    cursor.events.on('cursormoved', () => {
      const dataItem = (series.get('tooltip') as any)?.dataItem;
      if (dataItem) handleHover(dataItem);
      else handleOut();
    });

    // ── Data ─────────────────────────────────────────────────
    // Sort descending: highest score leftmost
    const sorted = [...entries]
      .sort((a, b) => b.score - a.score)
      .map((e) => ({
        name: (e.profile?.full_name ?? '').split(' ')[0] || '?',
        fullName: e.profile?.full_name ?? '?',
        score: Math.max(1, Math.round(e.score)),
        scoreLabel:
          e.score >= 1000
            ? `${(e.score / 1000).toFixed(1)}k`
            : String(Math.round(e.score)),
        pictureSettings: { src: getAvatarSrc(e) },
      }));

    series.data.setAll(sorted);
    xAxis.data.setAll(sorted);
    series.appear();
    chart.appear(1000, 100);

    return () => root.dispose();
  }, [entries]);

  if (entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-on-surface-variant">
        Nenhum relatório enviado para o dia selecionado.
      </div>
    );
  }

  return <div ref={chartRef} style={{ width: '100%', height: 340 }} />;
}
