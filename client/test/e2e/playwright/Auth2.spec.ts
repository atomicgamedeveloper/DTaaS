describe('big test', () => {
  beforeEach(async () => {
    await page.goto('localhost:4000/');
  });

  test("Open a Web page", async () => {
    expect(2 + 2).toEqual(4);
  });

})