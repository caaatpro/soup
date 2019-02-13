const Koa = require( 'koa' ),
	koaBody = require( 'koa-body' ),
  router = require('koa-router')(),
  logger = require('koa-logger'),
	nodemailer = require( 'nodemailer' ),
	db = require( './lib/db' ),
  iconv  = require('iconv-lite');
	config = require( './config.json' );

const app = new Koa();
var Buffer = require('buffer').Buffer;

app.use(logger());
app.use(koaBody());

function badEncoding(s) {
  return iconv.encode (iconv.decode (new Buffer (decodeURIComponent(unescape(s)), 'binary'), 'win1251'), 'utf8').toString();
}

router
	.post( '/email', async ( ctx, next ) => {
		// to
		// key
		// body
		// subject

    var query = ctx.request.body;
    console.log(ctx.request);
    console.log(query);

		if ( typeof query.key == 'undefined' ) {
			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '1',
				body: 'Not set key'
			} );
      console.log(ctx.body);
			return;
		}
		if ( typeof query.to == 'undefined' ) {
			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '1',
				body: 'Not set to'
			} );
      console.log(ctx.body);
			return;
		}
		if ( typeof query.body == 'undefined' ) {
			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '1',
				body: 'Not set body'
			} );
      console.log(ctx.body);
			return;
		}
		if ( typeof query.subject == 'undefined' ) {
			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '1',
				body: 'Not set subject'
			} );
      console.log(ctx.body);
			return;
		}

		try {
			var result = await db.query( 'SELECT id, s_host, s_port, s_secure, s_user, s_pass, s_from, is_bad FROM smtp WHERE s_key = {key} LIMIT 1', {
				key: query.key,
			} );
		} catch ( err ) {
			console.log( err );
			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '1',
				body: 'Incorrect key'
			} );
      console.log(ctx.body);
			return;
		}

		console.log( result );

		if ( result.length === 0 ) {
			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '1',
				body: 'Incorrect key'
			} );

			console.log( ctx.body );
			return;
		}

		let data = result[ 0 ];

    console.log(data);

		var smtpId = data.id;
		var from = data.s_from;

		var smtpConfig = {
			host: data.s_host,
			port: data.s_port
		};

		if ( data.s_secure == 1 ) {
			smtpConfig.secure = true;
		} else {
			smtpConfig.secure = false;
		}

		smtpConfig.auth = {
			user: data.s_user,
			pass: data.s_pass
		};

    if (data.is_bad == 1) {
      query.to = badEncoding(query.to);
      query.subject = badEncoding(query.subject);
      query.body = badEncoding(query.body);
    }

		let transporter = nodemailer.createTransport( smtpConfig );

		var mailOptions = {
			from: data.s_from,
			to: query.to,
			subject: query.subject,
			html: query.body.replace(/\n/g, '<br>')
		}

    console.log(mailOptions);

		try {
			var info = await transporter.sendMail( mailOptions );
			console.log( info );
		} catch ( err ) {
			console.log( err );

			try {
				await db.query( 'INSERT INTO messages (' +
					'm_to, ' +
					'm_smtpId, ' +
					'm_body, ' +
					'm_subject, ' +
					'm_status ' +
					') VALUES (' +
					'{to},' +
					'{smtpId},' +
					'{body},' +
					'{subject},' +
					'{status}' +
					')', {
						to: mailOptions.to,
						smtpId: smtpId,
						body: query.text,
						subject: mailOptions.subject,
						status: -1
					} );
			} catch ( err ) {
				console.log( err );
			}

			ctx.status = 400;
			ctx.body = JSON.stringify( {
				status: 'error',
				errorId: '2',
				body: 'Error sending'
			} );
      console.log(ctx.body);
			return;
		}

		console.log( 'Message info: ' );
		console.log( info );

		try {
			await db.query( 'INSERT INTO messages (' +
				'm_to, ' +
				'm_smtpId, ' +
				'm_body, ' +
				'm_subject, ' +
				'm_status ' +
				') VALUES (' +
				'{to},' +
				'{smtpId},' +
				'{body},' +
				'{subject},' +
				'{status}' +
				')', {
					to: mailOptions.to,
					smtpId: smtpId,
					body: query.text,
					subject: mailOptions.subject,
					status: 1
				} );
		} catch ( err ) {
			console.log( err );
		}

		ctx.status = 200;
		ctx.body = JSON.stringify( {
			status: 'ok'
		} );

    console.log(ctx.body);
		return;
	} );

app.use(router.routes());

app.listen( 3100 );
