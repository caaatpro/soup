var mysql = require( 'mysql' ),
	util = require( 'util' ),
	config = require( '../config.json' );

var pool = mysql.createPool( {
	connectionLimit: 0,
	host: config.db.host,
	user: config.db.user,
	password: config.db.password,
	database: config.db.database
} )
pool.getConnection( ( err, connection ) => {
	if ( err ) {
		if ( err.code === 'PROTOCOL_CONNECTION_LOST' ) {
			console.error( 'Database connection was closed.' )
		}
		if ( err.code === 'ER_CON_COUNT_ERROR' ) {
			console.error( 'Database has too many connections.' )
		}
		if ( err.code === 'ECONNREFUSED' ) {
			console.error( 'Database connection was refused.' )
		}
	}
	if ( connection ) {
		connection.config.queryFormat = function ( query, values ) {
			query = query.replace( /\{(\w+)\}/g, function ( txt, key ) {
				if ( values.hasOwnProperty( key ) ) {
					return this.escape( values[ key ] );
				}
				return txt;
			}.bind( this ) );

			console.log( query );

			return query;
		};

    connection.release();
	}

	return
} )
pool.query = util.promisify( pool.query );
module.exports = pool;
