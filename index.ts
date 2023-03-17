import puppeteer, { Page } from  "puppeteer"
import fs from 'fs';

interface Account {
  username: string;
  password: string;
}

interface SuccessfulLogin {
  username: string;
}

const readAccountsFromFile = (filename: string): Account[] => {
  const accountsBuffer = fs.readFileSync(filename);
  return JSON.parse(accountsBuffer.toString());
};

const writeSuccessfulLoginsToFile = (filename: string, successfulLogins: SuccessfulLogin[]) => {
  fs.writeFileSync(filename, JSON.stringify(successfulLogins, null, 2));
};

const loginToInstagram = async (page: Page, account: Account): Promise<boolean> => {
  try {
    await page.goto('https://www.instagram.com/accounts/login/', { waitUntil: 'networkidle0' });

    await page.waitForSelector('input[name="username"]', { timeout: 5000 });
    await page.type('input[name="username"]', account.username);
    await page.type('input[name="password"]', account.password);

    await Promise.all([
      page.click('button[type="submit"]'),
      page.waitForNavigation({ waitUntil: 'networkidle0' }),
    ]);

    const loginError = await page.$('p[id="slfErrorAlert"]');
    if (loginError) {
      console.log(`Hesap ${account.username} giriş yapamadı`);
      return false;
    } else {
      console.log(`${account.username} has successfully logged in *************`);
      return true;
    }
  } catch (error) {
    console.log(`${account.username} has failed to login with error: ${error}`);
    return false;
  }
};

const logoutFromInstagram = async (page: Page, username: string) => {
  await page.goto('https://www.instagram.com/accounts/logout/', { waitUntil: 'networkidle0' });
  console.log(`${username} has successfully logged out`);
};

(async () => {
  const accounts: Account[] = readAccountsFromFile('user_data.json');
  const successfulLogins: SuccessfulLogin[] = [];

  const browser = await puppeteer.launch({ headless: false });

  for (const account of accounts) {
    const page = await browser.newPage();
    try {
      const loginSuccess = await loginToInstagram(page, account);
      if (loginSuccess) {
        successfulLogins.push({ username: account.username });
        await logoutFromInstagram(page, account.username);
      }
    } finally {
      await page.close();
    }
  }

  console.log('Successful logins:', successfulLogins);
  writeSuccessfulLoginsToFile('successful_logins.json', successfulLogins);
  await browser.close();
})();
