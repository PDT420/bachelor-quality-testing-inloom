import { stringify } from '@angular/compiler/src/util';
import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { scaleLinear } from 'd3';
import { element } from 'protractor';
import { StatisticsService } from 'src/app/services/statistics.service';

@Component({
  selector: 'app-single-comparison',
  templateUrl: './single-comparison.component.html',
  styleUrls: ['./single-comparison.component.css'],
})
export class SingleComparisonComponent implements OnInit {
  @Input()
  testDataSetId: string;
  @Input()
  chartTitle: string;
  @Input()
  manEvalKey: string = null;
  @Input()
  autoEvalKey: string = null;

  tdsStatistics: Object;
  manEvalStats: Object;
  autoEvalStats: Object;

  constructor(public statisticsService: StatisticsService) {}

  ngOnInit(): void {
    this.statisticsService
      .getTDSStatistics(this.testDataSetId)
      .subscribe((result) => {
        // if the query has a body
        if (Object.keys(result).length > 0) {
          // story the tdsStatistics
          this.tdsStatistics = result;

          if (this.manEvalKey) {
            this.manEvalStats = result['man-eval-stats'][this.manEvalKey];
          } else {
            this.manEvalStats = result['avg-man-eval-stats'];
          }

          if (this.autoEvalKey) {
            this.autoEvalStats = result['auto-eval-stats'][this.autoEvalStats];
          } else {
            this.autoEvalStats = result['latest-auto-eval-stats'];
          }

          // Create chart
          this.createElementPerTypeChart();
        }
      });
  }

  createElementPerTypeChart(): void {
    const STATS_KEY = 'points-per-expert-element-type';
    const ROOT = d3.select('div#' + STATS_KEY);
    const MARGIN_VERTICAL = 20;
    const MARGIN_HORIZONTAL = 20;
    const ROOT_WIDTH = parseInt(ROOT.style('width'));
    const ROOT_HEIGHT = 400;
    const SVG_WIDTH = ROOT_WIDTH - 2 * MARGIN_HORIZONTAL;
    const SVG_HEIGHT = ROOT_HEIGHT - 2 * MARGIN_VERTICAL;

    // Unpack required data
    let _autoLocalStats: Map<string, number> = this.autoEvalStats[STATS_KEY];
    let _manLocalStats: Map<string, number> = this.manEvalStats[STATS_KEY];

    let xItems = Array.from(
      new Set([...Object.keys(_manLocalStats), ...Object.keys(_autoLocalStats)])
    );
    let yMaxValue = d3.max(
      new Set<number>([
        ...Object.values(_manLocalStats),
        ...Object.values(_autoLocalStats),
      ])
    );

    let _evalStats: Map<string, Object[]> = new Map();

    for (let elementType of xItems) {
      let manPoints: number = _manLocalStats[elementType];
      let autoPoints: number = _autoLocalStats[elementType];

      if (!manPoints) manPoints = 0;
      if (!autoPoints) autoPoints = 0;

      _evalStats.set(elementType, [
        { evalType: 'A', points: autoPoints },
        { evalType: 'M', points: manPoints },
      ]);
    }

    // Define a color scale for the
    // two possible bar colors.
    let color: Map<string, string> = new Map();
    color.set('A', '#1d7e99');
    color.set('M', '#e39127');

    // Create svg root
    let svg_root = ROOT.append('svg')
      .attr('width', ROOT_WIDTH)
      .attr('height', ROOT_HEIGHT)
      .append('g')
      .attr(
        'transform',
        'translate(' + MARGIN_VERTICAL + ', ' + MARGIN_HORIZONTAL + ')'
      );

    // Define x-scale
    let xScale = d3
      .scaleBand()
      .domain(xItems)
      .range([0, SVG_WIDTH])
      .padding(0.4);

    svg_root
      .append('g')
      .style('font', '14px roboto')
      .attr(
        'transform',
        'translate(' + MARGIN_HORIZONTAL + ', ' + SVG_HEIGHT + ')'
      )
      .call(d3.axisBottom(xScale).tickSize(0).tickPadding(6));

    // Define x-sub-scale
    let xSubScale = d3
      .scaleBand()
      .domain(['M', 'A'])
      .range([0, xScale.bandwidth()])
      .padding(0.1);

    // Define y-scale
    let yScale = d3
      .scaleLinear()
      .range([SVG_HEIGHT, 0])
      .domain([0, yMaxValue * 1.1]);

    svg_root
      .append('g')
      .style('font', '14px roboto')
      .attr('transform', 'translate(' + MARGIN_HORIZONTAL + ', 0)')
      .call(d3.axisLeft(yScale));

    // Adding values of manual eval to chart
    svg_root
      .append('g')
      .attr('transform', 'translate(' + MARGIN_HORIZONTAL + ', 0)')
      .selectAll('g')
      .data(xItems)
      .enter()
      .append('g')
      .attr('transform', (elementType) => {
        return 'translate(' + xScale(elementType) + ')';
      })
      .selectAll('rect')
      .data((elementType) => {
        return _evalStats.get(elementType);
      })
      .enter()
      .append('rect')
      .attr('x', (elementTypeStats) => {
        return xSubScale(elementTypeStats['evalType']);
      })
      .attr('y', (elementTypeStats) => {
        return yScale(elementTypeStats['points']);
      })
      .attr('height', (elementTypeStats) => {
        return SVG_HEIGHT - yScale(elementTypeStats['points']);
      })
      .attr('width', xSubScale.bandwidth())
      .attr('fill', (elementTypeStats) : string => {
        if (elementTypeStats['evalType'] != null) {
          return color.get(elementTypeStats['evalType']);
        } else return null;
      });
  }
}
