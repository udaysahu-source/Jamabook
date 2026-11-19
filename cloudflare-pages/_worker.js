export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    url.hostname = "jamabook.sidequestt.workers.dev";
    url.port = "443";
    url.protocol = "https:";

    const reqHeaders = new Headers(request.headers);
    reqHeaders.set("Host", "jamabook.sidequestt.workers.dev");

    const newRequest = new Request(url.toString(), {
      method: request.method,
      headers: reqHeaders,
      body: request.body,
      redirect: "manual"
    });

    return fetch(newRequest);
  }
};
