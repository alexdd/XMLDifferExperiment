<!-- ============================================================================
#    < diff.xsl />
#    This code implements the diffing algo which I described on my blog 
#    http://mandarine.tv/#post-117
#
#
#
#    Copyright (C) 2011           by Alex Duesel <alex@alex-duesel.de>
#                                        homepage: http://www.mandarine.tv
#                                        See file license.txt for licensing issues
#
#    This program is free software: you can redistribute it and/or modify
#    it under the terms of the GNU Lesser General Public License as published by
#    the Free Software Foundation, either version 3 of the License.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU Lesser General Public License for more details.
#
#    You should have received a copy of the GNU Lesser General Public License
#    along with this program.  If not, see <http://www.gnu.org/licenses/>.
#============================================================================-->


<xsl:stylesheet version='1.0'
  xmlns:xsl='http://www.w3.org/1999/XSL/Transform'
  xmlns:textdiff='http://alex-duesel.de/textdiff'
  xsl:exclude-result-prefixes='textdiff'>
  
	<!-- textdiff on PCDATA only elements using python xslt transformation libxslt -->

	<xsl:template match="node()|@*">
		<xsl:copy>
			<xsl:apply-templates select="node()|@*"/>
		</xsl:copy>
	</xsl:template>
	
	<!-- process only PCDATA elements which are marked as old -->
	
	<xsl:template match="*[@diffing-version='old']">
		<xsl:variable name="old" select="."/>
		<xsl:variable name="new" select="following-sibling::*"/>
		<xsl:copy>
			<xsl:apply-templates select="@*"/>
			
			<!-- call textdiff extension function which is declared in diff.py -->
			
			<xsl:value-of select='textdiff:textdiff(string($old),string($new))' disable-output-escaping='yes'/>
		</xsl:copy>
	</xsl:template>
	
	<xsl:template match="*[@diffing-version='new']"/>
  
</xsl:stylesheet>