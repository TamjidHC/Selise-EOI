export const MODELS = [
  { id: 'google/gemini-2.0-flash-exp:free',         label: 'Gemini 2.0 Flash (Free)'  },
  { id: 'meta-llama/llama-3.3-70b-instruct:free',   label: 'Llama 3.3 70B (Free)'     },
  { id: 'deepseek/deepseek-r1:free',                label: 'DeepSeek R1 (Free)'        },
  { id: 'anthropic/claude-sonnet-4-5',              label: 'Claude Sonnet (Premium)'   },
  { id: 'openai/gpt-4o',                            label: 'GPT-4o (Premium)'          },
]

export const ENTITIES = [
  'SELISE Group AG',
  'Secure Link Services Limited',
]

export const SELISE_OFFICES = [
  { city: 'Zurich',   entity: 'SELISE Group AG',                        address: 'The Circle 37, 8058 Zurich-Flughafen', country: 'Switzerland', phone: '+41 44 805 8044'  },
  { city: 'Dhaka',    entity: 'Secure Link Services Bangladesh Limited', address: 'Midas Center, H-05, R-16 Dhanmondi, Dhaka-1209', country: 'Bangladesh', phone: '+88 02 9104556'   },
  { city: 'Thimphu',  entity: 'Secure Link Services BT Pvt. Ltd',       address: 'Bhutan Innovation Tech Center Babesa, P.O. Box 63', country: 'Bhutan', phone: '+975-2-350-106'   },
  { city: 'Dubai',    entity: 'Secure Link Services FZ-LLC',            address: 'Building 03, Dubai Design District, PO Box 345858', country: 'UAE', phone: '+97143794110'     },
  { city: 'Munich',   entity: 'SELISE Deutschland GmbH',                address: 'Tal 44, 80331 Munchen', country: 'Germany', phone: '+49 89 5419 6883'  },
  { city: 'Prizren',  entity: 'SELISE Kosovo SH.P.K.',                  address: 'Rr. Uke Bytyqi (ITP Prizren), 20000 Prizren', country: 'Kosovo', phone: '+383 48 77 55 01'  },
]

export const SELISE_BOILERPLATE = `SELISE Group AG is a premier multinational software engineering, system integration, and strategic IT consulting firm headquartered in Zurich, Switzerland (The Circle 37, 8058 Zurich-Flughafen). Operating across eight global locations including Germany, UAE, Kosovo, Ukraine, Bhutan, Nepal, and Dhaka Bangladesh. Over 15 years experience. 700+ professionals. 1,500+ enterprise platforms delivered. ISO 9001:2015 (QMS) and ISO/IEC 27001:2022 (ISMS) certified. OWASP Top 10 compliant. CEO: Julian A. Weber (julian.weber@selisegroup.com). Phone: +41 (0) 448058044. Website: www.selisegroup.com. DELIVERY MODEL: Cross-shoring model combining Swiss engineering governance with a high-velocity Dhaka-based engineering hub. One Company philosophy — all 700+ staff operate under the same ISO-certified framework regardless of location.`
