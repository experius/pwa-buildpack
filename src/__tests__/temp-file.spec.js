jest.mock('fs');
const fs = require('fs');
const { setGracefulCleanup, fileSync, __mock } = require('tmp');
const TempFile = require('../temp-file');
const enc = 'utf8';
describe('lib/temp-file', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('ensures that temp files will be gracefully cleaned up on exit', () => {
        new TempFile();
        expect(setGracefulCleanup).toHaveBeenCalled();
    });
    it('with no args makes an empty TempFile instance with a path', () => {
        const tempFile = new TempFile();
        expect(tempFile.path).toBe(__mock.lastTmpName);
        expect(fileSync).toHaveBeenCalledWith(
            expect.objectContaining({
                discardDescriptor: true
            })
        );
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
    it('with one arg makes a TempFile instance and writes contents', () => {
        const tempFile = new TempFile('foo');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            tempFile.path,
            'foo',
            enc
        );
        expect(tempFile.contents).toBe('foo');
    });
    it('with falsy arg1 and string arg2 makes a TempFile instance with postfix but does not write contents', () => {
        new TempFile(null, '.bar');
        expect(fileSync).toHaveBeenCalledWith(
            expect.objectContaining({
                discardDescriptor: true,
                postfix: '.bar'
            })
        );
        expect(fs.writeFileSync).not.toHaveBeenCalled();
    });
    it('with string arg1 and string arg2 makes a TempFile instance with postfix and writes contents', () => {
        const tempFile = new TempFile('foo', '.bar');
        expect(fileSync).toHaveBeenCalledWith(
            expect.objectContaining({
                discardDescriptor: true,
                postfix: '.bar'
            })
        );
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            tempFile.path,
            'foo',
            enc
        );
        expect(tempFile.contents).toBe('foo');
    });
    it('write() method writes contents and sets .contents prop', () => {
        const tempFile = new TempFile();
        expect(fs.writeFileSync).not.toHaveBeenCalled();
        tempFile.write('new foo');
        expect(fs.writeFileSync).toHaveBeenCalledWith(
            tempFile.path,
            'new foo',
            enc
        );
        expect(tempFile.contents).toBe('new foo');
    });
    it('read() method reads contents, sets .contents, and returns them', () => {
        const tempFile = new TempFile();
        fs.readFileSync.mockReturnValueOnce('surprise');
        const out = tempFile.read();
        expect(fs.readFileSync).toHaveBeenCalledWith(tempFile.path, enc);
        expect(out).toBe('surprise');
        expect(tempFile.contents).toBe('surprise');
    });
    it('destroy() method attempts to remove', () => {
        const tempFile = new TempFile('foo');
        tempFile.destroy();
        expect(tempFile.contents).not.toBeDefined();
        expect(__mock.removeCallback).toHaveBeenCalled();
    });
    it('destroy() method swallows destruction errors', () => {
        const tempFile = new TempFile('foo');
        __mock.removeCallback.mockImplementationOnce(() => {
            throw Error('oh no');
        });
        expect(() => tempFile.destroy()).not.toThrowError();
    });
});