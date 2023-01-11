const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');
const fs = require('fs');
// const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;

const mode = process.env.NODE_ENV || 'development';
const isDevelopment = mode === 'development';

/** @type import('webpack').Configuration */
let config = {
  mode,
  entry: {
    background: './src/background/main.ts',
    popup: './src/popup/main.tsx',
    debug: './src/debug/main.ts',
    options: './src/options/main.tsx',
    'helps/empty-search-results': './src/helps/emptySearchResults.ts',
  },
  output: {
    path: `${__dirname}/public/js`,
  },
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx'],
  },
  module: {
    rules: [
      {
        test: /\.tsx?/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    useBuiltIns: 'usage',
                    corejs: 3,
                  },
                ],
              ],
            },
          },
          'ts-loader',
        ],
      },
      {
        test: /\.p?css$/,
        use: [
          'style-loader',
          'css-loader',
          {
            loader: 'postcss-loader',
            options: {
              postcssOptions: {
                plugins: ['postcss-nested'],
              },
            },
          },
        ],
      },
    ],
  },
  devtool: 'inline-source-map',
  optimization: {
    splitChunks: {
      name: 'vendor',
      chunks: (chunk) => chunk.name !== 'background',
    },
  },
  watchOptions: {
    ignored: /node_modules/,
  },
  experiments: {
    topLevelAwait: true,
  },
  // // Chrome 拡張においてファイルサイズは大した問題ではないので無視する
  // performance: {
  //   hints: false,
  // },
  plugins: [
    new webpack.DefinePlugin({
      IS_SENTRY_ENABLED:
        (process.env.IS_SENTRY_ENABLED &&
          JSON.parse(process.env.IS_SENTRY_ENABLED)) ??
        true,
      SETNRY_ARGS: {
        dsn: JSON.stringify(
          isDevelopment
            ? 'https://cba3c32ae1404f56a39f5cb4102beb64@o49171.ingest.sentry.io/4504401197989888'
            : 'https://f3a64ab117364c0cab0e2edf79c51113@o49171.ingest.sentry.io/4504401230823424',
        ),
        release: JSON.stringify(
          JSON.parse(fs.readFileSync('./public/manifest.json').toString())
            .version,
        ),
      },
    }),
    // new BundleAnalyzerPlugin(),
  ],
};

if (!isDevelopment) {
  config.plugins ||= [];
  config.plugins.push(
    new TerserPlugin({
      terserOptions: {
        compress: {
          pure_funcs: ['console.log', 'console.info'],
        },
      },
    }),
  );
}

module.exports = config;
