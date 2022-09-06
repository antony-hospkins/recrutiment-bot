const { GoogleSpreadsheet } = require("google-spreadsheet");
const creds = JSON.parse(process.env.GOOGLE_API_CREDS);

class WriteAnswers {
  constructor() {
    this.doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
  }

  async writeData(data) {
    await this.doc.useServiceAccountAuth(creds);
    await this.doc.loadInfo();
    const sheet = this.doc.sheetsByIndex[0];

    sheet.addRows(
      [
        {
          telegram_username: "",
          source: "",
          about_me: "",
          check_ram: "",
          experience: "",
          english_lvl: "",
          test: "",
          salary: "",
          priorities: "",
        },
        {
          telegram_username: data.telegram_username,
          source: data.source,
          about_me: data.about_me,
          check_ram: data.check_ram,
          experience: data.experience,
          english_lvl: data.english_lvl,
          test: data.test,
          salary: data.salary,
          priorities: data.priorities,
        },
      ],
      { insert: true }
    );
  }
}

const writeAnswers = new WriteAnswers();
module.exports = writeAnswers;
