
const puppeteer = require('puppeteer-extra')
const StealthPlugin = require('puppeteer-extra-plugin-stealth')
const fs = require('fs');
puppeteer.use(StealthPlugin())


class Main {
    result
    region
    pageNumber
    paginationUrl

    constructor(result) {
        this.result = result
        this.region = process.argv[2]
        this.pageNumber = 2
        this.paginationUrl = `href="/search/listings?clue=Builders&locationClue=${this.region}&pageNumber=`
    }
    async run() {
        // --------INIT-------------------------
        const browser = await puppeteer.launch({ headless: false})
        const page = await this.getPage(browser)

        await page.waitForSelector('.MuiInputBase-input', { timeout: 60000 });

        await page.click('button[type="button"]')

        await this.loopPages(page)

        this.writeToFile()

        browser.close();
    }

    async getPage(browser) {
        const page = await browser.newPage()

        await page.goto(`https://www.yellowpages.com.au/search/listings?clue=Builders&locationClue=${this.region}`);

        await page.setViewport({width: 1080, height: 1024});

        await page.setGeolocation({latitude: 59.95, longitude: 30.31667});

        return page
    }

    async loopPages(page) {
        do {
            await page.waitForSelector('a[class="MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-fullWidth"]', {timeout: 5000});
            console.log(`PAGE NUMBER: ${this.pageNumber - 1}`)

            await this.splitAndStoreEmails(page);

            var button = await page.$(`a[${this.paginationUrl}${this.pageNumber}"]`);

            try {
                await button.click()

                this.pageNumber++

                var selector = `a[${this.paginationUrl}${this.pageNumber}"]`;

                console.log('waiting for next page: ', selector);

                await page.waitForSelector(selector, {timeout: 20000})

            } catch {

                console.log('Scrape complete!')

                break
            }


        } while (await page.$('a[class="MuiButtonBase-root MuiButton-root MuiButton-outlined MuiButton-fullWidth"]', { timeout: 10000 }))
    }

    async splitAndStoreEmails(page) {
        const pageSourceHTML = await page.content();

        const initialState = await pageSourceHTML.split('__INITIAL_STATE__ = ')[1].split('; </script>')[0];

        const emails = await initialState.split('"primaryEmail":"');
        await emails.forEach(text => {
            if (text.includes('@')) {
                console.log(text.substring(0, 20), emails.length)
                const email = text.split('","')[0]      ;
                if (email.length < 75) {
                    this.result += email + ',\n';
                }
            } else {
                console.log('Email NOT written', text.substring(0, 20), emails.length)
            }
        })
    }

    writeToFile() {
        fs.writeFile(`${this.region}.txt`, this.result, function(err) {
            if(err) {
                return console.log(err)
            }
        });
    }
}

const go = new Main()

go.run()


