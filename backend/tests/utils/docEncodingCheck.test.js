/**
 * @jest-environment node
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

describe('Document Encoding Check CI Workflow', () => {
  let testDir;
  let originalCwd;

  beforeAll(() => {
    originalCwd = process.cwd();
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'doc-encoding-test-'));

    // Copy the script to test directory
    const originalScript = path.join(originalCwd, '..', 'scripts', 'check-doc-encoding.js');
    const scriptContent = fs.readFileSync(originalScript, 'utf8');
    fs.writeFileSync(path.join(testDir, 'check-doc-encoding.js'), scriptContent);

    // Change to test directory and initialize git
    process.chdir(testDir);
    execSync('git init', { stdio: 'ignore' });
    execSync('git config user.email "test@example.com"', { stdio: 'ignore' });
    execSync('git config user.name "Test User"', { stdio: 'ignore' });
  });

  afterAll(() => {
    process.chdir(originalCwd);
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  test('should pass validation for clean markdown files', () => {
    // Create a clean markdown file with allowed emojis
    const cleanContent = '# Test Document ✅\n\nThis has allowed emojis 🚀\n\nContent is clean.\n';
    fs.writeFileSync('clean-test.md', cleanContent, 'utf8');

    // Stage the file
    execSync('git add clean-test.md', { stdio: 'ignore' });

    // Run the encoding check - should not throw
    expect(() => {
      execSync('node check-doc-encoding.js', { stdio: 'pipe' });
    }).not.toThrow();

    // Cleanup
    fs.unlinkSync('clean-test.md');
  });

  test('should fail validation for files with encoding violations', () => {
    // Create a file with control characters
    const badContent = '# Test Document\x07\n\nThis has control characters.\n';
    fs.writeFileSync('bad-test.md', badContent, 'utf8');

    // Stage the file
    execSync('git add bad-test.md', { stdio: 'ignore' });

    // Run the encoding check - should throw (exit code 1)
    let errorOutput = '';
    try {
      execSync('node check-doc-encoding.js', { stdio: 'pipe' });
      // If we reach here, the test should fail
      expect(true).toBe(false);
    } catch (error) {
      errorOutput = error.stderr ? error.stderr.toString() : error.stdout.toString();
      expect(errorOutput).toContain('Documentation encoding/garble check failed');
      expect(errorOutput).toContain('bad-test.md');
    }

    // Cleanup
    fs.unlinkSync('bad-test.md');
  });

  test('should provide helpful error messages and tips', () => {
    // Create file with null bytes
    const nullByteContent = Buffer.from('# Test\x00Document\n');
    fs.writeFileSync('null-byte-test.md', nullByteContent);

    // Stage the file
    execSync('git add null-byte-test.md', { stdio: 'ignore' });

    // Run check and capture error output
    let errorOutput = '';
    try {
      execSync('node check-doc-encoding.js', { stdio: 'pipe' });
    } catch (error) {
      errorOutput = error.stderr ? error.stderr.toString() : error.stdout.toString();
    }

    // Verify error message format
    expect(errorOutput).toContain('❌ Documentation encoding/garble check failed');
    expect(errorOutput).toContain('null-byte-test.md');
    expect(errorOutput).toContain('Fix tips:');
    expect(errorOutput).toContain('Remove stray control/null chars');

    // Cleanup
    fs.unlinkSync('null-byte-test.md');
  });

  test('should handle no staged files gracefully', () => {
    // Ensure no files are staged
    try {
      execSync('git reset', { stdio: 'ignore' });
    } catch (err) {
      // Ignore if nothing to reset
    }

    // Run check with no staged files - should pass quietly
    expect(() => {
      execSync('node check-doc-encoding.js', { stdio: 'pipe' });
    }).not.toThrow();
  });

  test('should only check markdown files and docs directory', () => {
    // Create files that should be ignored
    fs.writeFileSync('script.js', '// JS with null\x00byte should be ignored\n');
    fs.writeFileSync('config.json', '{"value": "null\x00byte should be ignored"}\n');

    // Create markdown file that should be checked
    fs.writeFileSync('test.md', '# Good markdown\n\nClean content.\n', 'utf8');

    // Stage all files
    execSync('git add script.js config.json test.md', { stdio: 'ignore' });

    // Should pass because only test.md is checked and it's clean
    expect(() => {
      execSync('node check-doc-encoding.js', { stdio: 'pipe' });
    }).not.toThrow();

    // Cleanup
    fs.unlinkSync('script.js');
    fs.unlinkSync('config.json');
    fs.unlinkSync('test.md');
  });
});