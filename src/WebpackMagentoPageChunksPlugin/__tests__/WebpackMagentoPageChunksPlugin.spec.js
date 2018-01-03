const { join } = require('path');
const MemoryFS = require('memory-fs');
const { promisify: pify } = require('util');
const webpack = require('webpack');
const MagentoPageChunksPlugin = require('..');

const basic3PageProductDir = join(
    __dirname,
    '__fixtures__/basic-project-3-pages'
);
const basic1PageProjectDir = join(
    __dirname,
    '__fixtures__/basic-project-1-page'
);

const compile = async config => {
    const fs = new MemoryFS();
    const compiler = webpack(config);
    compiler.outputFileSystem = fs;

    return {
        fs,
        stats: await pify(compiler.run.bind(compiler))()
    };
};

test('Throws with actionable error when "entry" in config is not an object', async () => {
    expect.hasAssertions();
    const config = {
        entry: join(basic3PageProductDir, 'entry.js'),
        output: {
            path: join(basic3PageProductDir, 'dist')
        },
        plugins: [new MagentoPageChunksPlugin()]
    };
    try {
        await compile(config);
    } catch (err) {
        expect(err.message).toContain('"entry" is an object');
    }
});

test('Creates a chunk for each page when multiple pages exist', async () => {
    const config = {
        context: basic3PageProductDir,
        entry: {
            main: join(basic3PageProductDir, 'entry.js')
        },
        output: {
            path: join(basic3PageProductDir, 'dist'),
            filename: '[name].js',
            chunkFilename: '[name].chunk.js'
        },
        plugins: [
            new MagentoPageChunksPlugin({
                pagesDirs: [join(basic3PageProductDir, 'pages')]
            })
        ]
    };

    const { stats } = await compile(config);
    expect(stats.compilation.assets['Page1.chunk.js']).toBeTruthy();
    expect(stats.compilation.assets['Page2.chunk.js']).toBeTruthy();
    expect(stats.compilation.assets['Page3.chunk.js']).toBeTruthy();
});

test('Does not write injected entry to disk (only its chunks)', async () => {
    const config = {
        context: basic3PageProductDir,
        entry: {
            main: join(basic3PageProductDir, 'entry.js')
        },
        output: {
            path: join(basic3PageProductDir, 'dist'),
            filename: '[name].js',
            chunkFilename: '[name].chunk.js'
        },
        plugins: [
            new MagentoPageChunksPlugin({
                pagesDirs: [join(basic3PageProductDir, 'pages')],
                manifestFileName: 'manifest.json'
            })
        ]
    };

    const { fs } = await compile(config);
    const writtenFiles = fs.readdirSync(config.output.path).sort();
    const expectedFiles = [
        'Page1.chunk.js',
        'Page2.chunk.js',
        'Page3.chunk.js',
        'main.js',
        'manifest.json'
    ].sort();

    expect(writtenFiles).toEqual(expectedFiles);
});

test('Does not prevent chunk name from being configurable', async () => {
    const config = {
        context: basic3PageProductDir,
        entry: {
            main: join(basic3PageProductDir, 'entry.js')
        },
        output: {
            path: join(basic3PageProductDir, 'dist'),
            filename: '[name].js',
            chunkFilename: '[name].foobar.js'
        },
        plugins: [
            new MagentoPageChunksPlugin({
                pagesDirs: [join(basic3PageProductDir, 'pages')]
            })
        ]
    };

    const { stats } = await compile(config);
    expect(stats.compilation.assets['Page1.foobar.js']).toBeTruthy();
});

test('Writes manifest to location specified with "manifestFileName" option', async () => {
    const config = {
        context: basic3PageProductDir,
        entry: {
            main: join(basic3PageProductDir, 'entry.js')
        },
        output: {
            path: join(basic3PageProductDir, 'dist'),
            filename: '[name].js',
            chunkFilename: '[name].chunk.js'
        },
        plugins: [
            new MagentoPageChunksPlugin({
                pagesDirs: [join(basic3PageProductDir, 'pages')],
                manifestFileName: 'manifest.json'
            })
        ]
    };

    const { fs } = await compile(config);
    const manifest = JSON.parse(
        fs.readFileSync(
            join(basic3PageProductDir, 'dist/manifest.json'),
            'utf8'
        )
    );
    expect(manifest.Page1).toBe('Page1.chunk.js');
    expect(manifest.Page2).toBe('Page2.chunk.js');
    expect(manifest.Page3).toBe('Page3.chunk.js');
});

test('Creates chunks for all pages when multiple values are provided in "pagesDirs" config', async () => {
    const config = {
        context: basic1PageProjectDir,
        entry: {
            main: join(basic1PageProjectDir, 'entry.js')
        },
        output: {
            path: join(basic1PageProjectDir, 'dist'),
            filename: '[name].js',
            chunkFilename: '[name].chunk.js'
        },
        plugins: [
            new MagentoPageChunksPlugin({
                pagesDirs: [
                    join(basic3PageProductDir, 'pages'),
                    join(basic1PageProjectDir, 'pages')
                ]
            })
        ]
    };

    const { stats } = await compile(config);
    expect(stats.compilation.assets['Page1.chunk.js']).toBeTruthy();
    expect(stats.compilation.assets['SomePage.chunk.js']).toBeTruthy();
});
