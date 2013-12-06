<?xml version="1.0" encoding="UTF-8"?>

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

<!-- every node in XML tree must have a unique identifier (@id) assigned on creation -->
<!-- in order to tell differences between two version of a document -->

<xsl:stylesheet version="2.0" 
                       xmlns:xsl="http://www.w3.org/1999/XSL/Transform">
    
    <!-- assign testdata -->
    
    <xsl:param name="old-version">documentOld.xml</xsl:param>
    <xsl:param name="new-version">documentNew.xml</xsl:param>
    
    <xsl:output method="xml" indent="yes"/>
    
    <!-- copy all nodes -->
    
    <xsl:template match="@*" mode="#all">
        <xsl:copy>
            <xsl:apply-templates select="@*" mode="#current"/>
        </xsl:copy>
    </xsl:template>
    
    <!-- first step: analyze documents -->
    
    <xsl:template match="node()" mode="analyze">
        <xsl:copy>
            <xsl:choose>
                <xsl:when test="ancestor::new-version">
                    <xsl:variable name="y-id" select="if (@id) then @id else 'nope'"/>
                    <xsl:choose>
                        <xsl:when test="@id!='nope'">
			
			<!-- analyze new document -->
			
                            <xsl:choose>
                                
			   <!-- if id does not exist in old document mark as new -->
			   
			   <xsl:when test="not(/descendant::old-version//*[@id=$y-id])">
                                    <xsl:attribute name="diffing">new</xsl:attribute>
                                </xsl:when>
				
		           <!-- if id does exists in old document but text content changed then mark as changed -->
			   
                                <xsl:when test="not(normalize-space(string(.))=/descendant::old-version//*[@id=$y-id]/normalize-space(string(.)))">
                                    <xsl:attribute name="diffing">changed</xsl:attribute>
                                </xsl:when>
				
			<!-- otherwise mark as unchanged -->
			
                                <xsl:otherwise>
                                    <xsl:attribute name="diffing">unchanged</xsl:attribute>
                                </xsl:otherwise>
                            </xsl:choose>
                        </xsl:when>
                    </xsl:choose>
                </xsl:when>
                <xsl:otherwise>
		
		<!-- analyze old document  -->
		
                            <xsl:variable name="y-id" select="if (@id) then @id else 'nope'"/>
                            <xsl:choose>
                                <xsl:when test="@id!='nope'">
                                    <xsl:choose>
				    
				    <!-- if id does not exist in new document then mark as new -->
				    
                                        <xsl:when test="not(/descendant::new-version//*[@id=$y-id])">
                                            <xsl:attribute name="diffing">deleted</xsl:attribute>
                                        </xsl:when>
					
					<!-- see above -->
					
                                        <xsl:when test="not(normalize-space(string(.))=/descendant::new-version//*[@id=$y-id]/normalize-space(string(.)))">
                                            <xsl:attribute name="diffing">changed</xsl:attribute>
                                        </xsl:when>
                                        <xsl:otherwise>
                                            <xsl:attribute name="diffing">unchanged</xsl:attribute>
                                        </xsl:otherwise>
                                    </xsl:choose>
                                </xsl:when>
                            </xsl:choose>
                </xsl:otherwise>
            </xsl:choose>
            <xsl:apply-templates select="node()|@*" mode="analyze"/>
        </xsl:copy>
    </xsl:template>
    
    <!-- second step merge: copy nodes which are marked as deleted of  old version into new version -->
    
    <xsl:template match="node()" mode="merge">
        <xsl:variable name="y-id" select="if (@id) then @id else 'nope'"/>
        <xsl:variable name="old-elem" select="/descendant::old-version//*[@id=$y-id]"/>
                <xsl:choose>
                    <xsl:when test="$y-id!='nope' and not(ancestor::*[@diffing='unchanged'] or ancestor::*[@diffing='new'])">
                        <xsl:choose>
			
			<!-- if preceding-sibling of identical element in old version is marked as deleted then copy all direct preceding siblings which are marked as deleted -->
			<!-- from old version into new version -->
			
                            <xsl:when test="$old-elem/preceding-sibling::*[position()=1][@diffing='deleted']">
                                <xsl:copy-of select="$old-elem/preceding-sibling::*[@diffing='deleted'][following-sibling::*[not(@diffing='deleted')][position()=1][@id=$y-id]]"/>
                                <xsl:copy>
                                    <xsl:apply-templates select="node()|@*" mode="merge"/>
                                </xsl:copy>
                            </xsl:when>
			    
			   <!-- if there are only following sibling elements which are marked as deleted in axis then copy all deleted elements into new version -->
			   
                            <xsl:when test="count($old-elem/following-sibling::*[@diffing='changed' or @diffing='unchanged'])=0">
                                <xsl:copy>
                                    <xsl:apply-templates select="node()|@*" mode="merge"/>
                                </xsl:copy>
                                <xsl:copy-of select="$old-elem/following-sibling::*"/>
                            </xsl:when>
			    
			    <!-- otherwise just copy current element -->
			    
                            <xsl:otherwise>
                                <xsl:copy>
                                    <xsl:apply-templates select="node()|@*" mode="merge"/>
                                </xsl:copy>
                            </xsl:otherwise>
                        </xsl:choose>
                    </xsl:when>
                    <xsl:otherwise>
                        <xsl:copy>
                            <xsl:apply-templates select="node()|@*" mode="merge"/>
                        </xsl:copy>
                    </xsl:otherwise>
                </xsl:choose>
    </xsl:template>
    
    <!-- copy nodes in other steps -->
    
    <xsl:template match="node()" mode="textdiff final">
        <xsl:copy>
            <xsl:apply-templates select="node()|@*" mode="#current"/>
        </xsl:copy>
    </xsl:template>
    
    <!-- step 3 copy old text in PCDATA only elements into new version for textdiffing with python difflib see diff.py -->
    
    <xsl:template match="*[@diffing='changed'][not(child::*) and not(ancestor::*[@diffing='new'])  and not(ancestor::*[@diffing='deleted']) and not(ancestor::*[@diffing='unchanged'])]" mode="textdiff">
          <xsl:variable name="y-id" select="if (@id) then @id else 'nope'"/>
	<xsl:choose>
	    <xsl:when test="ancestor::p">
	        <xsl:copy>
	            <xsl:apply-templates select="@*" mode="#current"/>
	            <xsl:attribute name="text-changed">yes</xsl:attribute>
	            <xsl:apply-templates select="node()|@*" mode="#current"/>
                <xsl:text> </xsl:text>	            
	            (<xsl:value-of select="$input/descendant::old-version//*[@id=$y-id]"/>)
	        </xsl:copy>	        
	    </xsl:when>
	    <xsl:otherwise>
	        <xsl:copy>
	            <xsl:apply-templates select="@*" mode="#current"/>
	            <xsl:attribute name="diffing-version">old</xsl:attribute>
	            <xsl:value-of select="$input/descendant::old-version//*[@id=$y-id]"/>
	        </xsl:copy>
	        <xsl:copy>
	            <xsl:apply-templates select="@*" mode="#current"/>
	            <xsl:attribute name="diffing-version">new</xsl:attribute>
	            <xsl:apply-templates select="node()|@*" mode="#current"/>
	        </xsl:copy>
	    </xsl:otherwise>
	</xsl:choose>
        
    </xsl:template>
    
    <!-- setup input structure and process all three steps -->
    
            <xsl:variable name="input">
            <diffing>
                <old-version>
                    <xsl:copy-of select="document(concat('./',$old-version))"/>
                </old-version>
                <new-version>
                    <xsl:copy-of select="document(concat('./',$new-version))"/>  
                </new-version>
            </diffing>
        </xsl:variable>
    
    <xsl:template name="diff">
        <xsl:variable name="analyzed">
                <xsl:apply-templates select="$input" mode="analyze"/>
        </xsl:variable>
        <xsl:variable name="merged">
                <xsl:apply-templates select="$analyzed" mode="merge"/>
        </xsl:variable>
       <xsl:variable name="textdiffed">
	      <xsl:apply-templates select="$merged//new-version/*" mode="textdiff"/>
        </xsl:variable>
	<xsl:copy-of select="$textdiffed"/>
    </xsl:template>
  
</xsl:stylesheet>