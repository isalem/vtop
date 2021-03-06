/**
 * vtop – Velocity Top
 *
 * http://parall.ax/vtop
 *
 * Because `top` just ain't cutting it anymore.
 *
 * (c) 2014 James Hall, Parallax Agency Ltd
 *
 * @license MIT
 */

var App = function() {

	// Load in required libs
	var canvas = require('drawille'),
		blessed = require('blessed'),
		program = blessed.program(),
		os = require('os'),
		cli = require('commander');

	// Set up the commander instance and add the required options
	cli.option('-t, --theme [name]', 'set the vtop theme [parallax|brew|wizard]', 'parallax').parse(process.argv);

	/**
	 * Instance of blessed screen, and the charts object
	 */
	var screen, charts = [], loadedTheme;

	// Private variables

	/**
	 * This is the number of data points drawn
	 * @type {Number}
	 */
	var position = 0;

	var size = {
		pixel: {
			width: 0,
			height: 0
		},
		character: {
			width: 0,
			height: 0
		}
	};

	// @todo: move this into charts array
	// This is an instance of Blessed Box
	var graph;
	var graph2;

	// Private functions

	/**
	 * Draw header
	 * @param  {string} left  This is the text to go on the left
	 * @param  {string} right This is the text for the right
	 * @return {void}
	 */
	var drawHeader = function() {
		var header = blessed.text({
			top: 'top',
			left: 'left',
			width: '50%',
			height: '1',
			fg: loadedTheme.title.fg,
			content: ' {bold}vtop{/bold}{white-fg} for ' + os.hostname() + '{/white-fg}',
			tags: true
		});
		var date = blessed.text({
			top: 'top',
			left: '50%',
			width: '50%',
			height: '1',
			align: 'right',
			content: '',
			tags: true
		});
		screen.append(header);
		screen.append(date);

		var zeroPad = function(input) {
			return ('0' + input).slice(-2);
		};

		var updateTime = function() {
			var time = new Date();
			date.setContent(zeroPad(time.getHours()) + ':' + zeroPad(time.getMinutes()) + ':' + zeroPad(time.getSeconds()) + ' ');
			screen.render();
		};

		updateTime();
		setInterval(updateTime, 1000);
	};

	/**
	 * Draw the footer
	 *
	 * @todo This appears to break on some viewports
	 */
	var drawFooter = function() {
		var footerRight = blessed.text({
			bottom: '0',
			left: '0%',
			width: '100%',
			align: 'right',
			content: '(c) 2014 James Hall - http://parall.ax/vtop ',
			fg: loadedTheme.footer.fg
		});
		screen.append(footerRight);
	};

	/**
	 * Repeats a string
	 * @var string The string to repeat
	 * @var integer The number of times to repeat
	 * @return {string} The repeated chars as a string.
	 */
	var stringRepeat = function(string, num) {
		if (num < 0) {
			return '';
		}
		return new Array(num + 1).join(string);
	};

	/**
	 * This draws a chart
	 * @param  {int} chartKey The key of the chart.
	 * @return {string}       The text output to draw.
	 */
	var drawChart = function(chartKey) {
		var chart = charts[chartKey];
		var c = chart.chart;
		c.clear();

		charts[chartKey].values[position] = charts[chartKey].plugin.currentValue;

		var computeValue = function(input) {
			return chart.height - Math.floor(((chart.height + 1) / 100) * input) - 1;
		};

		for (var pos in charts[chartKey].values) {
			var p = parseInt(pos, 10) + (chart.width - charts[chartKey].values.length);
			if (p > 0 && computeValue(charts[chartKey].values[pos]) > 0) {
				c.set(p, computeValue(charts[chartKey].values[pos]));
			}

			for (var y = computeValue(charts[chartKey].values[pos]); y < chart.height; y ++) {
				if (p > 0 && y > 0) {
					c.set(p, y);
				}
			}
		}
		// Add percentage to top right of the chart by splicing it into the braille data
		var textOutput = c.frame().split("\n");
		var percent = '   ' + chart.plugin.currentValue;
		textOutput[0] = textOutput[0].slice(0, textOutput[0].length - 4) + '{white-fg}' + percent.slice(-3) + '%{/white-fg}';

		return textOutput.join("\n");
	};

	/**
	 * Draws a table.
	 * @param  {int} chartKey The key of the chart.
	 * @return {string}       The text output to draw.
	 */
	var drawTable = function(chartKey) {
		var chart = charts[chartKey];
		var columnLengths = {};

		// Clone the column array
		var columns = chart.plugin.columns.slice(0);
		columns.reverse();
		var i = 0;
		var removeColumn = false;
		var lastItem = columns[columns.length - 1];

		var minimumWidth = 12;
		var padding = 1;

		if (chart.width > 50) {
			padding = 2;
		}

		if (chart.width > 80) {
			padding = 3;
		}
		// Keep trying to reduce the number of columns
		do {
			var totalUsed = 0;
			var firstLength = 0;
			var totalColumns = columns.length;
			// Allocate space for each column in reverse order
			for (var column in columns) {
				var item = columns[column];
				i ++;
				// If on the last column (actually first because of array order)
				// then use up all the available space
				if (item == lastItem) {
					columnLengths[item] = chart.width - totalUsed;
					firstLength = columnLengths[item];
				} else {
					columnLengths[item] = item.length + padding;
				}
				totalUsed += columnLengths[item];
			}
			if (firstLength < minimumWidth && columns.length > 1) {
				totalUsed = 0;
				columns.shift();
				removeColumn = true;
			} else {
				removeColumn = false;
			}
		} while (removeColumn);

		// And back again
		columns.reverse();
		var output = '{bold}';
		for (var headerColumn in columns) {
			var colText = ' ' + columns[headerColumn];
			output += (colText + stringRepeat(' ', columnLengths[columns[headerColumn]] - colText.length));
		}
		output += '{/bold}' + "\n";

		for (var row in chart.plugin.currentValue) {
			var currentRow = chart.plugin.currentValue[row];
			for (var bodyColumn in columns) {
				var colText = ' ' + currentRow[columns[bodyColumn]];
				output += (colText + stringRepeat(' ', columnLengths[columns[bodyColumn]] - colText.length)).slice(0, columnLengths[columns[bodyColumn]]);
			}
			output += "\n";
		}
		return output;
	};

	/**
	 * Overall draw function, this should poll and draw results of 
	 * the loaded sensors.
	 */
	var draw = function() {
		position ++;

		var chartKey = 0;
		graph.setContent(drawChart(chartKey));
		graph2.setContent(drawChart(chartKey + 1));
		//console.log(processList.width);
		//console.log(charts[2].plugin.currentValue);
		processList.setContent(drawTable(chartKey + 2));

		screen.render();
	};

	// Public function (just the entry point)
	return {

		init: function() {
			// Get the theme, it defaults to parallax
			var theme = cli.theme;
			loadedTheme = require('./themes/' + theme + '.json');

			// Create a screen object.
			screen = blessed.screen();

			// Configure 'q', esc, Ctrl+C for quit
			screen.on('keypress', function(ch, key) {
				if (key.name === 'q' || key.name === 'escape' || (key.name == 'c' && key.ctrl === true)) {
					return process.exit(0);
				}
			});

			drawHeader();
			drawFooter();

			graph = blessed.box({
				top: 1,
				left: 'left',
				width: '100%',
				height: '50%',
				content: 'test',
				fg: loadedTheme.chart.fg,
				tags: true,
				border: loadedTheme.chart.border
			});

			screen.append(graph);

			var graph2appended = false;

			var createBottom = function() {
				if (graph2appended) {
					screen.remove(graph2);
					screen.remove(processList);
				}
				graph2appended = true;
				graph2 = blessed.box({
					top: graph.height + 1,
					left: 'left',
					width: '50%',
					height: graph.height - 1,
					content: 'test',
					fg: loadedTheme.chart.fg,
					tags: true,
					border: loadedTheme.chart.border
				});
				screen.append(graph2);

				processList = blessed.box({
					top: graph.height + 1,
					left: '50%',
					width: screen.width - graph2.width,
					height: graph.height - 1,
					keys: true,
					mouse: true,
					fg: loadedTheme.table.fg,
					tags: true,
					border: loadedTheme.table.border
				});
				screen.append(processList);
			};

			screen.on('resize', function() {
				createBottom();
			});
			createBottom();

			screen.append(graph);
			screen.append(processList);

			// Render the screen.
			screen.render();

			var setupCharts = function() {
				// @todo: Fix these drunken magic numbers
				size.pixel.width = (graph.width - 2) * 2;
				size.pixel.height = (graph.height - 2) * 4;

				var plugins = ['cpu', 'memory', 'process'];

				for (var plugin in plugins) {
					var width, height, currentCanvas;
					// @todo Refactor this
					switch (plugins[plugin]) {
						case 'cpu':
							width = (graph.width - 3) * 2;
							height = (graph.height - 2) * 4;
							currentCanvas = new canvas(width, height);
							break;
						case 'memory':
							width = (graph2.width - 3) * 2;
							height = ((graph2.height - 2) * 4);
							currentCanvas = new canvas(width, height);
							break;
						case 'process':
							width = processList.width - 3;
							height = processList.height - 2;
							break;
					}

					// If we're reconfiguring a plugin, then preserve the already recorded values
					var values;
					if (typeof charts[plugin] != 'undefined' && typeof charts[plugin].values != 'undefined') {
						values = charts[plugin].values;
					} else {
						values = [];
					}
					charts[plugin] = {
						chart: currentCanvas,
						values: values,
						plugin: require('./sensors/' + plugins[plugin] + '.js'),
						width: width,
						height: height
					};
					charts[plugin].plugin.poll();
				}
				// @TODO Make this less hard-codey
				graph.setLabel(' ' + charts[0].plugin.title + ' ');
				graph2.setLabel(' ' + charts[1].plugin.title + ' ');
				processList.setLabel(' ' + charts[2].plugin.title + ' ');

			};

			setupCharts();
			screen.on('resize', setupCharts);
			setInterval(draw, 100);

			// @todo Make this more sexy
			setInterval(charts[0].plugin.poll, charts[0].plugin.interval);
			setInterval(charts[1].plugin.poll, charts[1].plugin.interval);
			setInterval(charts[2].plugin.poll, charts[2].plugin.interval);

		}
	};
}();

App.init();