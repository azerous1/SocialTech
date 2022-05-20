import {React, useState, useContext, useRef, useEffect} from 'react';
import PropTypes from 'prop-types';
import text from "../../text/text.json"
import { Grid } from '@mui/material';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import TextareaAutosize from '@mui/material/TextareaAutosize';
import Rating from '@mui/material/Rating';
import appTheme from '../../theme/appTheme.json';
import ImageIcon from '@mui/icons-material/Image';
import Divider from '@mui/material/Divider';
import style from './style.js'
import { useStore } from '../../pages/Hook';
import AppContext from '../../AppContext';
import TagSelectionTab from './TagSelectionTab';
import Popover from '@mui/material/Popover';
import ImageThumbNailWithLightBox from '../ImageThumbNailWithLightBox';
import UserNotLoggedInPopOverContent from '../UserNotLoggedInPopOverContent';
import LoadingSpinner from '../../components/LoadingSpinner';
import { DEFAULT_COUNTRY, SHELTER_CARD_DISPLAY_STATUS, LOADING_SPINNER_SIZE } from '../../utils/utilityFunctions';

const PostCommentForm = ({ shelterName, shelter_post_id, handleClose, isUpdateComment, commentData, setCommentData, getShelterPostData = undefined }) => {
    const [commentText, setCommentText] = useState(commentData ? commentData.comment_body : "");
    const [selectedTags, setSelectedTags] = useState(commentData ? commentData.tags : []);
    const [starRating, setStarRating] = useState(commentData ? commentData.rating : 0);
    const [selectedFile, setSelectedFile] = useState([]);
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);
    const buttonRef = useRef(null);
    const [isLoaderActive, setIsLoaderActive] = useState(false);
    // const [fileSelectionErrMsg, setFileSelectionErrMsg] = useState(null);
    const fileInputRef = useRef(null);
    const { apiStore } = useStore();
    const appCtx = useContext(AppContext);

    console.log("shelter_post_id in post", shelter_post_id)
    useEffect(() => {
        const convertImageUrlToBlob = async () => {
            if (commentData) {
                console.log("ocmment data pics", commentData.pics)
                let res = await Promise.all(commentData.pics.map(async (url) => {
                    return fetch(url)
                }))
                console.log("comment data res", res);
                let imgBlob = await Promise.all(res.map(async (item) => {
                    return item.blob()
                }))

                console.log("comment data blob", imgBlob);
            
                setSelectedFile(imgBlob)
            }
        }
        convertImageUrlToBlob()
    }, [])

    const handleTextChange = (event) => {
        setCommentText(event.target.value)
    }

    const handleUploadComment = async () => {
        try {
            let imageUploadResponse = []
            for (let i = 0; i < selectedFile.length; i++) {
                imageUploadResponse.push(await apiStore.uploadImageToS3(selectedFile[i]));
            }
            console.log(imageUploadResponse)
            const commentUploadRes = await apiStore.createComment({
                post_id: shelter_post_id,
                comment_body: commentText,
                username: appCtx.user,
                rating: starRating,
                tags: selectedTags,
                pics: imageUploadResponse
            })
            console.log(commentUploadRes)
            if (getShelterPostData){
                console.log('clicked here amanda')
                await getShelterPostData();
            }
            await handleClose()
        } catch (err) {
            console.log("img upload error: " + err.message)
        }
    }

    const handleUpdateComment = async () => {
        try {
            console.log("hello? ")
            let imageUploadResponse = []
            for (let i = 0; i < selectedFile.length; i++) {
                imageUploadResponse.push(await apiStore.uploadImageToS3(selectedFile[i]));
            }
            console.log(imageUploadResponse)
            console.log("shelter_post_id", shelter_post_id)
            

            const updateCommnetRes = await apiStore.updateComment({
                comment_id: commentData.comment_id,
                post_id: shelter_post_id,
                rating: starRating,
                username: appCtx.user,
                comment_body: commentText,
                tags: selectedTags,
                pics: imageUploadResponse,
                likes: commentData.likes
            })
            console.log("updateCommnetRes", updateCommnetRes)
            if (setCommentData){
                let commentDataResponse = await apiStore.loadAllComments(appCtx.user);
                setCommentData(commentDataResponse)
            }
            handleClose()
        } catch (err) {
            console.log("update comment" + err.message)
        }
    }

    const selectFile = () => {
        fileInputRef.current.click()
    } 

    const selectedImagePreview = () => {
        let fileArray = Array.from(selectedFile)
        let imgArray = []
         for (let i = 0; i < fileArray.length; i++) {
            imgArray.push(URL.createObjectURL(fileArray[i]))
         }
         
        return fileArray.length === 0 ? null :
        <Grid container justifyContent='center'>
            {/* {fileArray.map(data => {
                return <Typography>{data.name}</Typography>
            })} */}
            {imgArray.map((url, index) => {
                return <ImageThumbNailWithLightBox 
                        key={index}
                        index={index}
                        imgs={imgArray}
                        selectedFile={selectedFile}
                        setSelectedFile={setSelectedFile} 
                        isDeletable={true}/>
            })}
        </Grid>
    } 

    return (
        isLoaderActive?
        <LoadingSpinner text={"Loading Data"} size={LOADING_SPINNER_SIZE.large} />:
        <Grid
            sx={style}
            container
            direction="column" 
            justifyContent="space-evenly" 
            alignItems="center">
                
            <Grid
                container
                direction="column" 
                justifyContent="center" 
                alignItems="center"
            >
                <Typography variant='h4' fontWeight={600}> {`Rate ${shelterName}`}</Typography>
                <Rating 
                    value={starRating} 
                    precision={0.5} 
                    onChange={(event, newRating) => {
                        setStarRating(newRating)
                    }}
                    sx={{ fontSize: "1.8rem" }}
                    style={{color: appTheme.palette.primary.main }}/>
            </Grid>
            <Typography style={{marginTop: "12px"}}>{text.postCommentForm.chooseTagPrompt}</Typography>
            <TagSelectionTab selectedTags={selectedTags} setSelectedTags={setSelectedTags}/>  

                <Grid
                    container
                    direction="column" 
                    justifyContent="center" 
                    alignItems="center"
                >
                    <TextareaAutosize
                        maxRows={6}
                        value={commentText}
                        placeholder={text.postCommentForm.textFieldPlaceHolder}
                        style={{width: "98%", height: "120px", fontFamily: "Roboto"}}
                        onChange={handleTextChange}/>
                </Grid>  
                <Divider style={{width: "100%"}}/> 
                <Grid
                    container
                    direction="row" 
                    justifyContent="flex-end" 
                    alignItems="center"
                    >
                    <Grid style={{padding: "5px"}}>
                        <input
                            type="file"
                            name="file"
                            onChange={ () => {
                                console.log("selected files: ", fileInputRef.current.files)
                                setSelectedFile(Array.from(fileInputRef.current.files))
                            }}
                            accept="image/*"
                            multiple
                            ref={fileInputRef}
                            style={{display: "none"}}/>
                        <ImageIcon onClick={() => selectFile()} style={{cursor: "pointer"}}/>
                    </Grid>
                </Grid>  

            {selectedImagePreview()}
            <br />
            <Grid
                container
                direction="row" 
                justifyContent="flex-end" 
                alignItems="center"
            >
                {isUpdateComment ?
                 <Button 
                    variant="contained"
                    onClick={() => {
                        handleUpdateComment()
                    }}>
                    Update Comment
                </Button> :
                <Button 
                    ref={buttonRef}
                    variant="contained"
                    onClick={async() => {
                        setIsLoaderActive(true)
                        if (!appCtx.user) {
                            setIsPopoverOpen(true)
                            return
                        }
                        await handleUploadComment()
                        setCommentText("")
                        setSelectedTags([])
                        setSelectedFile([])
                        setStarRating(0)
                        setIsLoaderActive(false)
                    }}>
                    {text.postCommentForm.postCommentBtn}
                </Button> }

                <Popover open={isPopoverOpen} onClose={() => setIsPopoverOpen(false)} anchorEl={buttonRef.current}>
                    <Grid style={{padding: "10px"}}>
                        <UserNotLoggedInPopOverContent/>
                    </Grid>
                </Popover>
            </Grid>  
        </Grid>   
         
    );
};

PostCommentForm.propTypes = {
    shelterName: PropTypes.string,
    userName: PropTypes.string,
    handleClose: PropTypes.func
};

export default PostCommentForm;
