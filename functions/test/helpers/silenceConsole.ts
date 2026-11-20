/**
 * Silences console output from the functions under test and exposes the
 * spies so tests can assert on logged errors.
 */
export function silenceConsole(): {log: jest.SpyInstance; error: jest.SpyInstance} {
  const spies = {
    log: jest.spyOn(console, "log").mockImplementation(() => undefined),
    error: jest.spyOn(console, "error").mockImplementation(() => undefined),
  };
  return spies;
}
