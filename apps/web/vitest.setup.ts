// Test-only defaults so modules that require deployment URLs can be imported.
// Individual tests override these with `vi.stubEnv` when they exercise config
// validation.
process.env.NEXT_PUBLIC_MAIN_URL ||= "https://main.example.com";
process.env.NEXT_PUBLIC_CHAIN_URL ||= "https://chain.example.com";
process.env.NEXT_PUBLIC_SKRIBBL_URL ||= "https://draw.example.com";
process.env.NEXT_PUBLIC_SMASHKARTS_URL ||= "https://karts.example.com";
process.env.NEXT_PUBLIC_HOLEIO_URL ||= "https://holeio.example.com";
process.env.NEXT_PUBLIC_WHOS_THE_SPY_URL ||= "https://spy.example.com";
