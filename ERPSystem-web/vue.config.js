const path = require('path')
const CompressionPlugin = require('compression-webpack-plugin')

function resolve (dir) {
    return path.join(__dirname, dir)
}

// vue.config.js
module.exports = {
    // No needEnvironment source map，Setfor false Environment。
    productionSourceMap: false,
    configureWebpack: config => {
        if (process.env.NODE_ENV !== 'production') {
            config.devtool = 'source-map'
        }
        // EnvironmentCancel console.log
        if (process.env.NODE_ENV === 'production') {
            config.optimization.minimizer[0].options.terserOptions.compress.drop_console = true
        }
    },
    chainWebpack: (config) => {
        config.resolve.alias
            .set('@$', resolve('src'))
            .set('@api', resolve('src/api'))
            .set('@assets', resolve('src/assets'))
            .set('@comp', resolve('src/components'))
            .set('@views', resolve('src/views'))
        // Environment，Enablejs\css
        if (process.env.NODE_ENV === 'production') {
            config.plugin('compressionPlugin').use(new CompressionPlugin({
                test: /\.(js|css|less)$/, // File
                threshold: 10240, // 10kData
                deleteOriginalAssets: false // DeleteFile
            }))
        }
    },
    css: {
        loaderOptions: {
            less: {
                modifyVars: {
                    /* less ， ant design Theme */
                    'primary-color': '#1890FF',
                    'link-color': '#1890FF',
                    'border-radius-base': '4px'
                },
                javascriptEnabled: true
            }
        }
    },
    devServer: {
        port: 3000,
        proxy: {
            '/ERPSystem-boot': {
                target: 'http://localhost:9999',
                ws: false,
                changeOrigin: true
            },
            '/jshERP-boot': {
                target: 'http://localhost:9999',
                pathRewrite: {
                    '^/jshERP-boot': '/ERPSystem-boot'
                },
                ws: false,
                changeOrigin: true
            }
        }
    },
    lintOnSave: undefined
}
