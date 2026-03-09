import { renderToString } from "hono/jsx/dom/server";

export type GenericEmailTemplateData = {
  title: string;
  message: string;
  details?: string | null;
  url?: string | null;
  source: string;
};

function GenericEmailTemplate(props: GenericEmailTemplateData) {
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Notification</title>
        <style>{`
          body, table, td, a {
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }

          table, td {
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
          }

          img {
            -ms-interpolation-mode: bicubic;
          }

          body {
            margin: 0;
            padding: 0;
            width: 100% !important;
            height: 100% !important;
            background-color: #f6f6f6;
          }

          table {
            border-collapse: collapse !important;
          }

          a {
            text-decoration: none;
          }

          .wrapper {
            width: 100%;
            background-color: #f6f6f6;
          }

          .container {
            width: 100%;
            max-width: 600px;
            background-color: #ffffff;
          }

          .px {
            padding-left: 32px;
            padding-right: 32px;
          }

          .py {
            padding-top: 32px;
            padding-bottom: 32px;
          }

          .title {
            font-family: Arial, sans-serif;
            font-size: 24px;
            line-height: 32px;
            font-weight: bold;
            color: #222222;
          }

          .meta {
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 20px;
            color: #666666;
          }

          .text {
            font-family: Arial, sans-serif;
            font-size: 16px;
            line-height: 24px;
            color: #444444;
          }

          .code {
            margin: 0;
            font-family: "Courier New", monospace;
            font-size: 14px;
            line-height: 20px;
            color: #444444;
            white-space: pre-wrap;
            word-break: break-word;
          }

          .button {
            display: inline-block;
            background-color: #007bff;
            color: #ffffff !important;
            font-family: Arial, sans-serif;
            font-size: 14px;
            line-height: 14px;
            padding: 14px 20px;
            border-radius: 4px;
          }

          .footer {
            font-family: Arial, sans-serif;
            font-size: 12px;
            line-height: 18px;
            color: #999999;
          }

          @media screen and (max-width: 600px) {
            .px {
              padding-left: 20px !important;
              padding-right: 20px !important;
            }

            .py {
              padding-top: 24px !important;
              padding-bottom: 24px !important;
            }

            .title {
              font-size: 22px !important;
              line-height: 28px !important;
            }

            .text {
              font-size: 15px !important;
              line-height: 22px !important;
            }

            .mobile-full {
              display: block !important;
              width: 100% !important;
            }

            .button {
              display: block !important;
              width: 100% !important;
              box-sizing: border-box !important;
              text-align: center !important;
            }
          }
        `}</style>
      </head>
      <body>
        <table
          role="presentation"
          width="100%"
          border={0}
          cellSpacing={0}
          cellPadding={0}
          class="wrapper"
        >
          <tr>
            <td align="center" style="padding: 24px 12px">
              <table
                role="presentation"
                width="100%"
                border={0}
                cellSpacing={0}
                cellPadding={0}
                class="container"
              >
                <tr>
                  <td class="px py">
                    <table
                      role="presentation"
                      width="100%"
                      border={0}
                      cellSpacing={0}
                      cellPadding={0}
                    >
                      <tr>
                        <td class="title">{props.title}</td>
                      </tr>

                      <tr>
                        <td height="10" style="line-height: 10px; font-size: 10px">
                          &nbsp;
                        </td>
                      </tr>

                      <tr>
                        <td height="24" style="line-height: 24px; font-size: 24px">
                          &nbsp;
                        </td>
                      </tr>

                      <tr>
                        <td class="text">
                          <pre class="code">{props.message}</pre>
                        </td>
                      </tr>

                      {props.details ? (
                        <>
                          <tr>
                            <td
                              height="16"
                              style="line-height: 16px; font-size: 16px"
                            >
                              &nbsp;
                            </td>
                          </tr>
                          <tr>
                            <td class="text">
                              <pre class="code">{props.details}</pre>
                            </td>
                          </tr>
                        </>
                      ) : null}

                      {props.url ? (
                        <>
                          <tr>
                            <td
                              height="28"
                              style="line-height: 28px; font-size: 28px"
                            >
                              &nbsp;
                            </td>
                          </tr>
                          <tr>
                            <td>
                              <a href={props.url} target="_blank" class="button">
                                View Details
                              </a>
                            </td>
                          </tr>
                        </>
                      ) : null}

                      <tr>
                        <td height="32" style="line-height: 32px; font-size: 32px">
                          &nbsp;
                        </td>
                      </tr>

                      <tr>
                        <td class="footer">
                          This notification was generated by {props.source}.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  );
}

export function renderGenericEmailTemplate(
  data: GenericEmailTemplateData,
): string {
  return "<!doctype html>" + renderToString(<GenericEmailTemplate {...data} />);
}
