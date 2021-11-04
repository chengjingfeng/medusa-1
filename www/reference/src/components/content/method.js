import React, { useContext, useEffect, useRef } from "react"
import Markdown from "react-markdown"
import { Flex, Text, Box, Heading } from "theme-ui"
import { convertToKebabCase } from "../../utils/convert-to-kebab-case"
import Parameters from "./parameters"
import Route from "./route"
import JsonContainer from "./json-container"
import Description from "./description"
import ResponsiveContainer from "./responsive-container"
import { formatMethodParams } from "../../utils/format-parameters"
import useInView from "../../hooks/use-in-view"
import NavigationContext from "../../context/navigation-context"
import { formatRoute } from "../../utils/format-route"

const Method = ({ data, section, pathname, api }) => {
  const { parameters, requestBody, description, method, summary } = data
  const jsonResponse = data.responses[0].content?.[0].json
  const { updateHash, updateMetadata } = useContext(NavigationContext)
  const methodRef = useRef(null)
  const [containerRef, isInView] = useInView({
    root: null,
    rootMargin: "0px 0px -80% 0px",
    threshold: 0,
  })

  useEffect(() => {
    if (isInView) {
      updateHash(section, convertToKebabCase(summary))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView])

  const handleMetaChange = () => {
    updateMetadata({
      title: summary,
      description: description,
    })
    if (methodRef.current) {
      methodRef.current.scrollIntoView({
        behavior: "smooth",
      })
    }
  }

  const getCurlJson = (properties, prefix) => {
    if(!properties[0])
    {
      return
    }
    const res = {}
    const jsonObject = JSON.parse(jsonResponse)
    const pathParts = pathname.split('/')
    
    // if the endpoint is for a relation i.e. /orders/:id/shipment drill down into the properties of the json object
    if(pathParts.length > 3)
    {
      const propertyIndex = pathParts[2].match(/{[A-Za-z_]+}/) ? 3 : 2
      for(const element of properties) {
        try{
            const obj = jsonObject[pathParts[propertyIndex].replace('-', '_')] || jsonObject[Object.keys(jsonObject)[0]][pathParts[propertyIndex].replace('-', '_')]
            res[element.property] = Array.isArray(obj) ? obj.find(o => o[element.property])[element.property] : obj[element.property]
            break;
        } catch(err) {}
      }
    }

    // if nothing was found drilling down look at the top level properties
    if(JSON.stringify(res) === '{}')
    {
      for(const element of properties) {
        try{
            res[element.property] = jsonObject[element.property] || jsonObject[Object.keys(jsonObject)[0]][element.property]
            break;
        } catch(err) {}
      }
    }

    // Last resort, set the first property to an example
    if(JSON.stringify(res) === '{}'){
      res[properties[0].property] = `${prefix}_${properties[0].property}`
    }
    
    return res
  }

  const getCurlCommand = (requestBody) => {
    const body = JSON.stringify(getCurlJson(requestBody?.properties, `example_${section}`))
    return (
`curl -X ${data.method.toUpperCase()} https://medusa-url.com/${api}${formatRoute(pathname)} \\
  --header "Authorization: Bearer <ACCESS TOKEN>" ${data.method.toUpperCase() === 'POST' && requestBody.properties?.length > 0 ? `\\
  --header "content-type: application/json" \\
  --data '${body}'` : ""}`
      )
    }

  return (
    <Flex
      py={"5vw"}
      sx={{
        borderTop: "hairline",
        flexDirection: "column",
      }}
      id={convertToKebabCase(summary)}
      ref={methodRef}
    >
      <Flex>
        <Heading
          as="h2"
          mb={4}
          sx={{
            fontSize: "4",
            fontWeight: "500",
            cursor: "pointer",
          }}
          ref={containerRef}
          onClick={() => handleMetaChange()}
        >
          {summary}
        </Heading>
      </Flex>
      <ResponsiveContainer>
        <Flex
          className="info"
          sx={{
            flexDirection: "column",
            pr: "5",
            "@media screen and (max-width: 848px)": {
              pr: "0",
            },
          }}
        >
          <Route path={pathname} method={method} />
          <Description>
            <Text
              sx={{
                lineHeight: "26px",
              }}
              mt={3}
            >
              <Markdown>{description}</Markdown>
            </Text>
          </Description>
          <Box mt={2}>
            <Parameters
              params={formatMethodParams({ parameters, requestBody })}
              type={"Parameters"}
            />
          </Box>
        </Flex>
        <Box className="code">
          <Box>
          <JsonContainer
            json={getCurlCommand(requestBody)}
            header={"cURL Example"}
            language={'shell'}
            allowCopy={true}
            method={convertToKebabCase(summary)}
            />
            </Box>
          <Box>
          <JsonContainer
            json={jsonResponse}
            header={"RESPONSE"}
            method={convertToKebabCase(summary)}
            />
            </Box>
        </Box>
      </ResponsiveContainer>
    </Flex>
  )
}

export default Method
