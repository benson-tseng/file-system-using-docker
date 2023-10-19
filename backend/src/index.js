const koa = require('koa')
const Router = require('koa-router')
const { koaBody } = require("koa-body");
const path = require('path')
require("dotenv").config();
const Minio = require("minio");
const fs = require('fs');
const cors = require("@koa/cors");
const mime = require('mime-types')

const app = new koa()

const minioClient = new Minio.Client({
  accessKey: process.env.ACCESS_KEY,
  secretKey: process.env.SECRET_KEY,
  endPoint: process.env.HOST,
  useSSL: false,
  port: 9000
});


app.use(cors({}))
var router = new Router();

const bucketName = "bucket1";

router
  .post('/upload', async ctx => {
    const file = ctx.request.files.file
    const fileData = fs.readFileSync("./public/" + file.newFilename);
    await minioClient
      .putObject(bucketName, file.originalFilename, fileData)
      .catch((e) => {
        console.log("Error while creating object from file data: ", e);
        throw e;
      });
    console.log(`Upload ${file.originalFilename} finished`)

    ctx.body = 1

    fs.unlink("./public/" + file.newFilename, (err) => {
      if (err) {
        throw err;
      }
    });
  })

  .get('/objList', async ctx => {
    var data = []
    var stream = minioClient.listObjects(bucketName, '', true)
    stream.on('data', function (obj) {
      data.push(obj)
    })
    stream.on('error', function (err) {
      console.log(err)
    })

    // stream.on('end', function (obj) {
    //   console.log(data)
    // })

    await new Promise(resolve => stream.on('end', resolve));
    ctx.body = data
  })

  .get('/download/:filename', async ctx => {
    const fileObjectKey = ctx.params.filename;
    var mimeType = mime.lookup(fileObjectKey);
    try {
      const object = await minioClient.getObject(bucketName, fileObjectKey);
      const fileStream = fs.createWriteStream("./public/tmp");

      object.on("data", (chunk) => fileStream.write(chunk));
      object.on("end", () => console.log(`Reading ${fileObjectKey} finished`));

      ctx.body = fs.createReadStream("./public/tmp");
      ctx.response.set("content-type", mimeType);
      ctx.response.set('Content-disposition', 'attachment; filename=' + fileObjectKey);

      // fs.unlink("./public/" + "tmp.txt", (err) => {
      //   if (err) {
      //     throw err;
      //   }
      // });

    } catch (e) {
      ctx.status = 400
      ctx.body = "file not found"
    }
  })
  .get('/remove/:filename', async ctx => {
    try {
      await minioClient.removeObject(bucketName, ctx.params.filename)
      console.log(`Removing ${ctx.params.filename} finished`)
      ctx.body = "1"
    } catch (e) {
      ctx.status = 400
      ctx.body = "file not found"
    }
  })
  .get('/test', ctx => {
    ctx.body = 2
  })

app.use(koaBody({
  multipart: true,
  formidable: {
    uploadDir: path.join('public'),
  }
}));
app.use(router.routes());

app.listen(3000, () => {
  console.log('http://localhost:3000')
});