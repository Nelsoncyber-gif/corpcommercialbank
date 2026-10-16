const countryCodes = `
AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ
BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ
CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ
DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR
GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY
HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP
KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY
MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY
MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN
PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN
SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ
UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS XK YE YT ZA ZM ZW
`.trim().split(/\s+/);

const currencyByCountry = {};
const addCurrency = (currency, countries) => {
  for (const code of countries.split(/\s+/)) currencyByCountry[code] = currency;
};

addCurrency('USD', 'AS BQ EC FM GU IO MH MP PR PW SV TL TC UM US VG VI');
addCurrency('EUR', 'AD AT AX BE BL CY DE EE ES FI FR GF GP GR HR IE IT LT LU LV MC ME MF MT NL PM PT RE SI SK SM VA XK');
addCurrency('XOF', 'BF BJ CI GW ML NE SN TG');
addCurrency('XAF', 'CF CG CM GA GQ TD');
addCurrency('XCD', 'AG AI DM GD KN LC MS VC');
addCurrency('XPF', 'NC PF WF');
addCurrency('AUD', 'AU CC CX HM KI NR NF TV');
addCurrency('GBP', 'GB GG IM JE');
addCurrency('GBP', 'GS');
addCurrency('DKK', 'DK FO GL');
addCurrency('NZD', 'NU NZ');
addCurrency('BMD', 'BM');
addCurrency('NOK', 'BV');
addCurrency('BYN', 'BY');
addCurrency('NZD', 'CK PN TK');
addCurrency('FKP', 'FK');
addCurrency('GIP', 'GI');
addCurrency('HTG', 'HT');
addCurrency('KYD', 'KY');
addCurrency('EUR', 'MQ TF YT');
addCurrency('SHP', 'SH');
addCurrency('SEK', 'SE');
addCurrency('NOK', 'NO SJ');
addCurrency('CHF', 'CH LI');
addCurrency('CAD', 'CA');
addCurrency('JPY', 'JP');
addCurrency('CNY', 'CN');
addCurrency('INR', 'IN');
addCurrency('BRL', 'BR');
addCurrency('MXN', 'MX');
addCurrency('PEN', 'PE');
addCurrency('ARS', 'AR');
addCurrency('CLP', 'CL');
addCurrency('COP', 'CO');
addCurrency('UYU', 'UY');
addCurrency('PYG', 'PY');
addCurrency('BOB', 'BO');
addCurrency('VES', 'VE');
addCurrency('CRC', 'CR');
addCurrency('DOP', 'DO');
addCurrency('GTQ', 'GT');
addCurrency('HNL', 'HN');
addCurrency('NIO', 'NI');
addCurrency('PAB', 'PA');
addCurrency('CUP', 'CU');
addCurrency('JMD', 'JM');
addCurrency('TTD', 'TT');
addCurrency('BBD', 'BB');
addCurrency('BSD', 'BS');
addCurrency('BZD', 'BZ');
addCurrency('GYD', 'GY');
addCurrency('SRD', 'SR');
addCurrency('AWG', 'AW');
addCurrency('XCG', 'CW SX');
addCurrency('ISK', 'IS');
addCurrency('PLN', 'PL');
addCurrency('CZK', 'CZ');
addCurrency('HUF', 'HU');
addCurrency('RON', 'RO');
addCurrency('BGN', 'BG');
addCurrency('RSD', 'RS');
addCurrency('BAM', 'BA');
addCurrency('MKD', 'MK');
addCurrency('ALL', 'AL');
addCurrency('MDL', 'MD');
addCurrency('UAH', 'UA');
addCurrency('RUB', 'RU');
addCurrency('TRY', 'TR');
addCurrency('GEL', 'GE');
addCurrency('AMD', 'AM');
addCurrency('AZN', 'AZ');
addCurrency('KZT', 'KZ');
addCurrency('UZS', 'UZ');
addCurrency('KGS', 'KG');
addCurrency('TJS', 'TJ');
addCurrency('TMT', 'TM');
addCurrency('AFN', 'AF');
addCurrency('PKR', 'PK');
addCurrency('BDT', 'BD');
addCurrency('LKR', 'LK');
addCurrency('NPR', 'NP');
addCurrency('BTN', 'BT');
addCurrency('MVR', 'MV');
addCurrency('MMK', 'MM');
addCurrency('THB', 'TH');
addCurrency('LAK', 'LA');
addCurrency('KHR', 'KH');
addCurrency('VND', 'VN');
addCurrency('IDR', 'ID');
addCurrency('MYR', 'MY');
addCurrency('SGD', 'SG');
addCurrency('BND', 'BN');
addCurrency('PHP', 'PH');
addCurrency('KRW', 'KR');
addCurrency('KPW', 'KP');
addCurrency('MNT', 'MN');
addCurrency('TWD', 'TW');
addCurrency('HKD', 'HK');
addCurrency('MOP', 'MO');
addCurrency('FJD', 'FJ');
addCurrency('PGK', 'PG');
addCurrency('SBD', 'SB');
addCurrency('VUV', 'VU');
addCurrency('WST', 'WS');
addCurrency('TOP', 'TO');
addCurrency('AED', 'AE');
addCurrency('SAR', 'SA');
addCurrency('QAR', 'QA');
addCurrency('KWD', 'KW');
addCurrency('BHD', 'BH');
addCurrency('OMR', 'OM');
addCurrency('YER', 'YE');
addCurrency('ILS', 'IL PS');
addCurrency('JOD', 'JO');
addCurrency('LBP', 'LB');
addCurrency('SYP', 'SY');
addCurrency('IQD', 'IQ');
addCurrency('IRR', 'IR');
addCurrency('EGP', 'EG');
addCurrency('MAD', 'MA EH');
addCurrency('DZD', 'DZ');
addCurrency('TND', 'TN');
addCurrency('LYD', 'LY');
addCurrency('SDG', 'SD');
addCurrency('SSP', 'SS');
addCurrency('ETB', 'ET');
addCurrency('ERN', 'ER');
addCurrency('DJF', 'DJ');
addCurrency('SOS', 'SO');
addCurrency('KES', 'KE');
addCurrency('UGX', 'UG');
addCurrency('TZS', 'TZ');
addCurrency('RWF', 'RW');
addCurrency('BIF', 'BI');
addCurrency('CDF', 'CD');
addCurrency('ZAR', 'ZA');
addCurrency('NAD', 'NA');
addCurrency('LSL', 'LS');
addCurrency('SZL', 'SZ');
addCurrency('BWP', 'BW');
addCurrency('ZMW', 'ZM');
addCurrency('ZWG', 'ZW');
addCurrency('MWK', 'MW');
addCurrency('MZN', 'MZ');
addCurrency('AOA', 'AO');
addCurrency('NGN', 'NG');
addCurrency('GHS', 'GH');
addCurrency('GNF', 'GN');
addCurrency('GMD', 'GM');
addCurrency('SLE', 'SL');
addCurrency('LRD', 'LR');
addCurrency('CVE', 'CV');
addCurrency('STN', 'ST');
addCurrency('MUR', 'MU');
addCurrency('SCR', 'SC');
addCurrency('KMF', 'KM');
addCurrency('MGA', 'MG');
addCurrency('MRU', 'MR');
addCurrency('USD', 'AQ');

const unmappedCurrencyCountries = countryCodes.filter(code => !currencyByCountry[code]);
if (unmappedCurrencyCountries.length > 0) {
  throw new Error(`Missing currency mappings for country codes: ${unmappedCurrencyCountries.join(', ')}`);
}

const dialCodeByCountry = {
  AD: '376', AE: '971', AF: '93', AG: '1', AI: '1', AL: '355', AM: '374', AO: '244',
  AR: '54', AS: '1', AT: '43', AU: '61', AW: '297', AZ: '994', BA: '387', BB: '1',
  BD: '880', BE: '32', BF: '226', BG: '359', BH: '973', BI: '257', BJ: '229', BM: '1',
  BN: '673', BO: '591', BR: '55', BS: '1', BT: '975', BW: '267', BY: '375', BZ: '501',
  CA: '1', CD: '243', CF: '236', CG: '242', CH: '41', CI: '225', CL: '56', CM: '237',
  CN: '86', CO: '57', CR: '506', CU: '53', CV: '238', CW: '599', CY: '357', CZ: '420',
  DE: '49', DJ: '253', DK: '45', DM: '1', DO: '1', DZ: '213', EC: '593', EE: '372',
  EG: '20', ER: '291', ES: '34', ET: '251', FI: '358', FJ: '679', FM: '691', FO: '298',
  FR: '33', GA: '241', GB: '44', GD: '1', GE: '995', GH: '233', GI: '350', GM: '220',
  GN: '224', GQ: '240', GR: '30', GT: '502', GU: '1', GW: '245', GY: '592', HK: '852',
  HN: '504', HR: '385', HT: '509', HU: '36', ID: '62', IE: '353', IL: '972', IN: '91',
  IQ: '964', IR: '98', IS: '354', IT: '39', JM: '1', JO: '962', JP: '81', KE: '254',
  KG: '996', KH: '855', KI: '686', KM: '269', KN: '1', KP: '850', KR: '82', KW: '965',
  KZ: '7', LA: '856', LB: '961', LC: '1', LI: '423', LK: '94', LR: '231', LS: '266',
  LT: '370', LU: '352', LV: '371', LY: '218', MA: '212', MC: '377', MD: '373', ME: '382',
  MG: '261', MH: '692', MK: '389', ML: '223', MM: '95', MN: '976', MO: '853', MR: '222',
  MT: '356', MU: '230', MV: '960', MW: '265', MX: '52', MY: '60', MZ: '258', NA: '264',
  NE: '227', NG: '234', NI: '505', NL: '31', NO: '47', NP: '977', NR: '674', NZ: '64',
  OM: '968', PA: '507', PE: '51', PG: '675', PH: '63', PK: '92', PL: '48', PT: '351',
  PW: '680', PY: '595', QA: '974', RO: '40', RS: '381', RU: '7', RW: '250', SA: '966',
  SB: '677', SC: '248', SD: '249', SE: '46', SG: '65', SI: '386', SK: '421', SL: '232',
  SM: '378', SN: '221', SO: '252', SR: '597', SS: '211', ST: '239', SV: '503', SY: '963',
  SZ: '268', TD: '235', TG: '228', TH: '66', TJ: '992', TL: '670', TM: '993', TN: '216',
  TO: '676', TR: '90', TT: '1', TV: '688', TW: '886', TZ: '255', UA: '380', UG: '256',
  US: '1', UY: '598', UZ: '998', VA: '39', VC: '1', VE: '58', VN: '84', VU: '678',
  WS: '685', XK: '383', YE: '967', ZA: '27', ZM: '260', ZW: '263',
  AX: '358', BV: '47', IO: '246', VG: '1', BQ: '599', KY: '1', CX: '61', CC: '61',
  CK: '682', FK: '500', GF: '594', PF: '689', TF: '262', GL: '299', GP: '590', GG: '44',
  HM: '61', IM: '44', JE: '44', MQ: '596', YT: '262', MS: '1', NC: '687', NU: '683', MP: '1',
  NF: '672', PS: '970', PN: '64', PR: '1', RE: '262', SX: '1', GS: '500', BL: '590',
  SH: '290', MF: '590', PM: '508', SJ: '47', TK: '690', TC: '1', UM: '1', VI: '1',
  WF: '681', EH: '212'
};

const displayNames = new Intl.DisplayNames(['en'], { type: 'region' });
const countries = countryCodes
  .map(code => ({
    code,
    name: code === 'XK' ? 'Kosovo' : displayNames.of(code),
    currency: currencyByCountry[code],
    dialCode: dialCodeByCountry[code] || ''
  }))
  .filter(country => country.name && country.name !== country.code)
  .sort((a, b) => a.name.localeCompare(b.name));

if (countries.length !== countryCodes.length) {
  throw new Error('Country display names are missing for one or more country codes.');
}

const countriesByCode = new Map(countries.map(country => [country.code, country]));

module.exports = { countries, countriesByCode };
