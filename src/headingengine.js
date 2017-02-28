/**
 * @license Copyright (c) 2003-2017, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.md.
 */

/**
 * @module heading/headingengine
 */

import Plugin from '@ckeditor/ckeditor5-core/src/plugin';
import buildModelConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildmodelconverter';
import buildViewConverter from '@ckeditor/ckeditor5-engine/src/conversion/buildviewconverter';
import Paragraph from '@ckeditor/ckeditor5-paragraph/src/paragraph';
import HeadingCommand from './headingcommand';

/**
 * The headings engine feature. It handles switching between block formats &ndash; headings and paragraph.
 * This class represents the engine part of the heading feature. See also {@link module:heading/heading~Heading}.
 *
 * @extends modules:core/plugin~Plugin
 */
export default class HeadingEngine extends Plugin {
	/**
	 * @inheritDoc
	 */
	constructor( editor ) {
		super( editor );

		const t = editor.t;

		/**
		 * A set of default localized labels for `config.heading.options`.
		 *
		 * @readonly
		 * @protected
		 * @member {Object} #_localizedFormatLabels
		 */
		const labels = this._localizedFormatLabels = {
			Paragraph: t( 'Paragraph' ),
			'Heading 1': t( 'Heading 1' ),
			'Heading 2': t( 'Heading 2' ),
			'Heading 3': t( 'Heading 3' )
		};

		editor.config.define( 'heading', {
			options: [
				{ id: 'paragraph', element: 'p', label: labels.Paragraph },
				{ id: 'heading1', element: 'h2', label: labels[ 'Heading 1' ] },
				{ id: 'heading2', element: 'h3', label: labels[ 'Heading 2' ] },
				{ id: 'heading3', element: 'h4', label: labels[ 'Heading 3' ] }
			],
			defaultOptionId: 'paragraph'
		} );
	}

	/**
	 * @inheritDoc
	 */
	static get requires() {
		return [ Paragraph ];
	}

	/**
	 * @inheritDoc
	 */
	init() {
		const editor = this.editor;
		const data = editor.data;
		const editing = editor.editing;
		const options = this._options;
		const defaultOptionId = editor.config.get( 'heading.defaultOptionId' );

		for ( let option of options ) {
			// Skip paragraph - it is defined in required Paragraph feature.
			if ( option.id !== defaultOptionId ) {
				// Schema.
				editor.document.schema.registerItem( option.id, '$block' );

				// Build converter from model to view for data and editing pipelines.
				buildModelConverter().for( data.modelToView, editing.modelToView )
					.fromElement( option.id )
					.toElement( option.element );

				// Build converter from view to model for data pipeline.
				buildViewConverter().for( data.viewToModel )
					.fromElement( option.element )
					.toElement( option.id );
			}
		}

		// Register the heading command.
		const command = new HeadingCommand( editor, options );
		editor.commands.set( 'heading', command );
	}

	/**
	 * @inheritDoc
	 */
	afterInit() {
		// If the enter command is added to the editor, alter its behavior.
		// Enter at the end of a heading element should create a paragraph.

		const editor = this.editor;
		const command = editor.commands.get( 'heading' );
		const enterCommand = editor.commands.get( 'enter' );
		const options = this._options;

		if ( enterCommand ) {
			this.listenTo( enterCommand, 'afterExecute', ( evt, data ) => {
				const positionParent = editor.document.selection.getFirstPosition().parent;
				const batch = data.batch;
				const isHeading = options.some( option => option.id == positionParent.name );

				if ( isHeading && positionParent.name != command.defaultOption.id && positionParent.childCount === 0 ) {
					batch.rename( positionParent, command.defaultOption.id );
				}
			} );
		}
	}

	/**
	 * A set of options as defined in `config.heading.options`, considering
	 * editor localization.
	 *
	 * @readonly
	 * @protected
	 * @type {Array.<module:heading/headingcommand~HeadingOption>}
	 */
	get _options() {
		const editor = this.editor;

		return editor.config.get( 'heading.options' )
			.map( option => {
				// Translate `label`s in the config to with current locale using `#_localizedFormatLabels` because
				// there's no way to use t() when the config is defined i.e. when the editor does not
				// exist yet.
				if ( this._localizedFormatLabels[ option.label ] ) {
					// Clone the option to avoid altering the original `config.heading.options`.
					option = Object.assign( {}, option, {
						label: this._localizedFormatLabels[ option.label ]
					} );
				}

				return option;
			} );
	}
}
